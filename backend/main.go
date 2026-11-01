package main

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	_ "modernc.org/sqlite"
)

type Event struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	EventDate   string `json:"eventDate"`
	EventTime   string `json:"eventTime"`
	Venue       string `json:"venue"`
	ImageURL    string `json:"imageUrl"`
	Capacity    int    `json:"capacity"`
	Registered  int    `json:"registered"`
}
type Notice struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Priority    string `json:"priority"`
	PublishedAt string `json:"publishedAt"`
}
type Registration struct {
	ID             int    `json:"id"`
	StudentID      string `json:"studentId"`
	FullName       string `json:"fullName"`
	CollegeEmail   string `json:"collegeEmail"`
	Department     string `json:"department"`
	AcademicYear   string `json:"academicYear"`
	Phone          string `json:"phone,omitempty"`
	AdditionalInfo string `json:"additionalInfo,omitempty"`
	RegisteredAt   string `json:"registeredAt"`
	Reference      string `json:"reference"`
	Event          Event  `json:"event"`
}
type EventInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	EventDate   string `json:"eventDate"`
	EventTime   string `json:"eventTime"`
	Venue       string `json:"venue"`
	ImageURL    string `json:"imageUrl"`
	Capacity    int    `json:"capacity"`
}

var db *sql.DB

func fail(c *gin.Context, code int, msg string) { c.JSON(code, gin.H{"error": msg}) }
func getEvent(id int) (Event, error) {
	var e Event
	err := db.QueryRow(`SELECT e.id,e.title,e.description,e.category,e.event_date,e.event_time,e.venue,e.image_url,e.capacity,(SELECT count(*) FROM registrations r WHERE r.event_id=e.id) FROM events e WHERE e.id=?`, id).Scan(&e.ID, &e.Title, &e.Description, &e.Category, &e.EventDate, &e.EventTime, &e.Venue, &e.ImageURL, &e.Capacity, &e.Registered)
	return e, err
}
func allEvents(search, cat string) ([]Event, error) {
	rows, err := db.Query(`SELECT e.id,e.title,e.description,e.category,e.event_date,e.event_time,e.venue,e.image_url,e.capacity,(SELECT count(*) FROM registrations r WHERE r.event_id=e.id) FROM events e WHERE (?='' OR lower(e.title||' '||e.description||' '||e.venue) LIKE '%'||lower(?)||'%') AND (?='' OR lower(e.category)=lower(?)) ORDER BY e.event_date,e.event_time`, search, search, cat, cat)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Event{}
	for rows.Next() {
		var e Event
		if err = rows.Scan(&e.ID, &e.Title, &e.Description, &e.Category, &e.EventDate, &e.EventTime, &e.Venue, &e.ImageURL, &e.Capacity, &e.Registered); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}
func valid(in EventInput) string {
	if strings.TrimSpace(in.Title) == "" || strings.TrimSpace(in.Description) == "" || strings.TrimSpace(in.Category) == "" || strings.TrimSpace(in.Venue) == "" {
		return "Title, description, category, and venue are required"
	}
	if _, err := time.Parse("2006-01-02", in.EventDate); err != nil {
		return "Event date must use YYYY-MM-DD"
	}
	if _, err := time.Parse("15:04", in.EventTime); err != nil {
		return "Event time must use HH:MM"
	}
	if in.Capacity < 0 {
		return "Capacity cannot be negative"
	}
	return ""
}
func main() {
	path := os.Getenv("CAMPUSCONNECT_DB")
	if path == "" {
		path = "campusconnect.db"
	}
	var err error
	db, err = sql.Open("sqlite", path)
	if err != nil {
		panic(err)
	}
	db.SetMaxOpenConns(1)
	if err = db.Ping(); err != nil {
		panic(err)
	}
	initDB()
	initAdmin()
	r := gin.Default()
	if err := r.SetTrustedProxies(nil); err != nil {
		panic("could not configure trusted proxies")
	}
	r.Use(func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		allowed := origin == "http://localhost:5173" || origin == "http://127.0.0.1:5173" || (os.Getenv("FRONTEND_ORIGIN") != "" && origin == os.Getenv("FRONTEND_ORIGIN"))
		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Vary", "Origin")
		}
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})
	api := r.Group("/api")
	api.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
	api.GET("/events", func(c *gin.Context) {
		es, e := allEvents(c.Query("search"), c.Query("category"))
		if e != nil {
			fail(c, 500, "Could not load events")
			return
		}
		c.JSON(200, es)
	})
	api.GET("/events/:id", func(c *gin.Context) {
		id, e := strconv.Atoi(c.Param("id"))
		if e != nil || id < 1 {
			fail(c, 400, "Invalid event ID")
			return
		}
		v, e := getEvent(id)
		if errors.Is(e, sql.ErrNoRows) {
			fail(c, 404, "Event not found")
			return
		}
		if e != nil {
			fail(c, 500, "Could not load event")
			return
		}
		c.JSON(200, v)
	})
	api.GET("/admin/csrf", csrfEndpoint)
	api.POST("/admin/login", login)
	api.GET("/admin/session", adminAuth, adminSessionInfo)
	api.POST("/admin/logout", adminAuth, adminCSRF, logout)
	admin := api.Group("/events", adminAuth, adminCSRF)
	admin.POST("", createEvent)
	admin.PUT("/:id", updateEvent)
	admin.DELETE("/:id", deleteEvent)
	api.POST("/registrations", register)
	api.GET("/registrations", registrations)
	api.DELETE("/registrations/:id", cancelRegistration)
	api.GET("/notices", notices)
	addr := os.Getenv("API_ADDR")
	if addr == "" {
		addr = ":18080"
	}
	if err = r.Run(addr); err != nil {
		panic(fmt.Sprintf("server: %v", err))
	}
}
func ensureColumn(table, column, definition string) {
	rows, err := db.Query("PRAGMA table_info(" + table + ")")
	if err != nil {
		panic(err)
	}
	defer rows.Close()
	for rows.Next() {
		var cid, notnull, pk int
		var name, typ string
		var dflt any
		if err := rows.Scan(&cid, &name, &typ, &notnull, &dflt, &pk); err != nil {
			panic(err)
		}
		if name == column {
			return
		}
	}
	if _, err := db.Exec("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition); err != nil {
		panic(err)
	}
}

func initDB() {
	db.Exec(`PRAGMA foreign_keys=ON`)
	schema := []string{`CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL,category TEXT NOT NULL,event_date TEXT NOT NULL,event_time TEXT NOT NULL,venue TEXT NOT NULL,image_url TEXT NOT NULL DEFAULT '',capacity INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`, `CREATE TABLE IF NOT EXISTS registrations(id INTEGER PRIMARY KEY,student_id TEXT NOT NULL,event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(student_id,event_id))`, `CREATE TABLE IF NOT EXISTS notices(id INTEGER PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL,category TEXT NOT NULL,priority TEXT NOT NULL,published_at TEXT NOT NULL)`}
	for _, s := range schema {
		if _, e := db.Exec(s); e != nil {
			panic(e)
		}
	}
	migrations := map[string]string{
		"full_name": "TEXT NOT NULL DEFAULT ''", "college_email": "TEXT NOT NULL DEFAULT ''", "department": "TEXT NOT NULL DEFAULT ''", "academic_year": "TEXT NOT NULL DEFAULT ''", "phone": "TEXT NOT NULL DEFAULT ''", "additional_info": "TEXT NOT NULL DEFAULT ''", "owner_token": "TEXT NOT NULL DEFAULT ''",
	}
	for column, definition := range migrations {
		ensureColumn("registrations", column, definition)
	}
	if _, err := db.Exec(`CREATE INDEX IF NOT EXISTS registrations_owner_idx ON registrations(owner_token)`); err != nil {
		panic(err)
	}
	var n int
	db.QueryRow(`SELECT count(*) FROM events`).Scan(&n)
	if n == 0 {
		samples := []EventInput{{"CodeSprint Hackathon", "Build a useful prototype with a team in a day. Mentors and prizes provided.", "Technical", "2026-11-15", "09:00", "Innovation Lab", "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1100&q=80", 120}, {"InnovateX Technology Summit", "A day of talks on AI, climate tech and the future of computing.", "Seminar", "2026-11-20", "10:00", "Auditorium A", "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1100&q=80", 250}, {"Campus Cultural Fest", "Three days of music, dance, food and student showcases.", "Cultural", "2026-12-03", "16:00", "Main Quad", "https://images.unsplash.com/photo-1501382017468-8e3e1ee6f3e3?auto=format&fit=crop&w=1100&q=80", 800}, {"Robotics Workshop", "Hands-on introduction to sensors, actuators and autonomous bots.", "Workshop", "2026-11-12", "14:00", "Engineering Block 2", "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1100&q=80", 40}, {"Shutter Stories Photo Walk", "Explore campus through a guided photography challenge.", "Cultural", "2026-11-18", "07:30", "Library Steps", "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1100&q=80", 60}, {"Inter-College Sports Meet", "Compete across track, court and field events.", "Sports", "2026-12-10", "08:00", "University Stadium", "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1100&q=80", 500}, {"Start-up Stories", "Founders share the pivots, lessons and first customers behind their ventures.", "Seminar", "2026-11-25", "11:00", "Business School 104", "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1100&q=80", 100}, {"Music & Arts Night", "An open-air celebration of student bands and visual art.", "Cultural", "2026-12-14", "18:30", "Amphitheatre", "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1100&q=80", 300}}
		for _, v := range samples {
			db.Exec(`INSERT INTO events(title,description,category,event_date,event_time,venue,image_url,capacity) VALUES(?,?,?,?,?,?,?,?)`, v.Title, v.Description, v.Category, v.EventDate, v.EventTime, v.Venue, v.ImageURL, v.Capacity)
		}
	}
	db.QueryRow(`SELECT count(*) FROM notices`).Scan(&n)
	if n == 0 {
		items := []Notice{{Title: "Annual technical fest registrations are open", Description: "Reserve your place at InnovateX and meet makers from across campus.", Category: "Events", Priority: "Important", PublishedAt: "2026-10-28"}, {Title: "Internal assessment schedule announced", Description: "Check the student portal for your updated assessment timetable.", Category: "Academic", Priority: "Normal", PublishedAt: "2026-10-26"}, {Title: "Robotics workshop deadline approaching", Description: "Only a few seats remain. Registration closes on November 10.", Category: "Workshop", Priority: "Important", PublishedAt: "2026-10-24"}, {Title: "Inter-college sports registrations open", Description: "Team captains should submit rosters to the sports office.", Category: "Sports", Priority: "Normal", PublishedAt: "2026-10-21"}, {Title: "Cultural committee auditions scheduled", Description: "Auditions take place in the amphitheatre this Friday.", Category: "Campus", Priority: "Normal", PublishedAt: "2026-10-18"}}
		for _, v := range items {
			db.Exec(`INSERT INTO notices(title,description,category,priority,published_at) VALUES(?,?,?,?,?)`, v.Title, v.Description, v.Category, v.Priority, v.PublishedAt)
		}
	}
}
func createEvent(c *gin.Context) {
	var in EventInput
	if c.ShouldBindJSON(&in) != nil {
		fail(c, 400, "Invalid JSON body")
		return
	}
	if m := valid(in); m != "" {
		fail(c, 400, m)
		return
	}
	res, e := db.Exec(`INSERT INTO events(title,description,category,event_date,event_time,venue,image_url,capacity) VALUES(?,?,?,?,?,?,?,?)`, in.Title, in.Description, in.Category, in.EventDate, in.EventTime, in.Venue, in.ImageURL, in.Capacity)
	if e != nil {
		fail(c, 500, "Could not create event")
		return
	}
	id, _ := res.LastInsertId()
	v, _ := getEvent(int(id))
	c.JSON(201, v)
}
func updateEvent(c *gin.Context) {
	id, e := strconv.Atoi(c.Param("id"))
	if e != nil || id < 1 {
		fail(c, 400, "Invalid event ID")
		return
	}
	var in EventInput
	if c.ShouldBindJSON(&in) != nil {
		fail(c, 400, "Invalid JSON body")
		return
	}
	if m := valid(in); m != "" {
		fail(c, 400, m)
		return
	}
	res, e := db.Exec(`UPDATE events SET title=?,description=?,category=?,event_date=?,event_time=?,venue=?,image_url=?,capacity=? WHERE id=?`, in.Title, in.Description, in.Category, in.EventDate, in.EventTime, in.Venue, in.ImageURL, in.Capacity, id)
	if e != nil {
		fail(c, 500, "Could not update event")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		fail(c, 404, "Event not found")
		return
	}
	v, _ := getEvent(id)
	c.JSON(200, v)
}
func deleteEvent(c *gin.Context) {
	id, e := strconv.Atoi(c.Param("id"))
	if e != nil || id < 1 {
		fail(c, 400, "Invalid event ID")
		return
	}
	res, e := db.Exec(`DELETE FROM events WHERE id=?`, id)
	if e != nil {
		fail(c, 500, "Could not delete event")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		fail(c, 404, "Event not found")
		return
	}
	c.JSON(200, gin.H{"message": "Event deleted"})
}
func notices(c *gin.Context) {
	rows, err := db.Query(`SELECT id,title,description,category,priority,published_at FROM notices ORDER BY published_at DESC,id DESC`)
	if err != nil {
		fail(c, 500, "Could not load notices")
		return
	}
	defer rows.Close()
	out := []Notice{}
	for rows.Next() {
		var n Notice
		rows.Scan(&n.ID, &n.Title, &n.Description, &n.Category, &n.Priority, &n.PublishedAt)
		out = append(out, n)
	}
	c.JSON(200, out)
}
