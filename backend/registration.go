package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type registrationInput struct {
	EventID        int    `json:"eventId"`
	FullName       string `json:"fullName"`
	StudentID      string `json:"studentId"`
	CollegeEmail   string `json:"collegeEmail"`
	Department     string `json:"department"`
	AcademicYear   string `json:"academicYear"`
	Phone          string `json:"phone"`
	AdditionalInfo string `json:"additionalInfo"`
}

var phonePattern = regexp.MustCompile(`^\+?[0-9][0-9 ()-]{6,19}$`)
var departments = map[string]bool{
	"Computer Science and Engineering":          true,
	"Information Technology":                    true,
	"Electronics and Communication Engineering": true,
	"Electrical and Electronics Engineering":    true,
	"Mechanical Engineering":                    true,
	"Civil Engineering":                         true,
	"Other":                                     true,
}
var academicYears = map[string]bool{"1st Year": true, "2nd Year": true, "3rd Year": true, "4th Year": true, "5th Year": true, "Graduate": true}

func registrationReference(id int) string { return fmt.Sprintf("CC-%06d", id) }

func ownerDigest(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
func normalizeRegistration(in *registrationInput) map[string]string {
	in.FullName = strings.Join(strings.Fields(in.FullName), " ")
	in.StudentID = strings.TrimSpace(in.StudentID)
	in.CollegeEmail = strings.ToLower(strings.TrimSpace(in.CollegeEmail))
	in.Department = strings.TrimSpace(in.Department)
	in.AcademicYear = strings.TrimSpace(in.AcademicYear)
	in.Phone = strings.TrimSpace(in.Phone)
	in.AdditionalInfo = strings.TrimSpace(in.AdditionalInfo)
	errors := map[string]string{}
	if len(in.FullName) < 2 || len(in.FullName) > 100 {
		errors["fullName"] = "Enter your full name (2–100 characters)."
	}
	if len(in.StudentID) < 2 || len(in.StudentID) > 40 {
		errors["studentId"] = "Enter a valid student ID."
	}
	address, err := mail.ParseAddress(in.CollegeEmail)
	if err != nil || address.Address != in.CollegeEmail || len(in.CollegeEmail) > 254 {
		errors["collegeEmail"] = "Enter a valid college email address."
	}
	if !departments[in.Department] {
		errors["department"] = "Choose a department from the list."
	}
	if !academicYears[in.AcademicYear] {
		errors["academicYear"] = "Choose your academic year."
	}
	if in.Phone != "" && !phonePattern.MatchString(in.Phone) {
		errors["phone"] = "Enter a valid phone number, or leave this optional field blank."
	}
	if len(in.AdditionalInfo) > 1000 {
		errors["additionalInfo"] = "Keep additional information under 1,000 characters."
	}
	if in.EventID < 1 {
		errors["eventId"] = "Choose a valid event."
	}
	return errors
}

func register(c *gin.Context) {
	var in registrationInput
	if c.ShouldBindJSON(&in) != nil {
		fail(c, 400, "Invalid registration details")
		return
	}
	fieldErrors := normalizeRegistration(&in)
	if len(fieldErrors) != 0 {
		c.JSON(400, gin.H{"error": "Check the highlighted registration details.", "fields": fieldErrors})
		return
	}
	event, err := getEvent(in.EventID)
	if errors.Is(err, sql.ErrNoRows) {
		fail(c, 404, "Event not found")
		return
	}
	if err != nil {
		fail(c, 500, "Could not check event availability")
		return
	}
	date, err := time.Parse("2006-01-02", event.EventDate)
	if err != nil || date.Before(time.Now().Truncate(24*time.Hour)) {
		fail(c, 400, "Registration is closed for past events")
		return
	}
	owner, err := guestOwner(c)
	if err != nil {
		fail(c, 500, "Could not start a registration session")
		return
	}
	tx, err := db.Begin()
	if err != nil {
		fail(c, 500, "Could not register for this event")
		return
	}
	defer tx.Rollback()
	var duplicate int
	if err = tx.QueryRow(`SELECT count(*) FROM registrations WHERE student_id=? AND event_id=?`, in.StudentID, in.EventID).Scan(&duplicate); err != nil {
		fail(c, 500, "Could not check existing registrations")
		return
	}
	if duplicate != 0 {
		fail(c, 409, "This student is already registered for this event")
		return
	}
	var count int
	if err = tx.QueryRow(`SELECT count(*) FROM registrations WHERE event_id=?`, in.EventID).Scan(&count); err != nil {
		fail(c, 500, "Could not check event capacity")
		return
	}
	if event.Capacity > 0 && count >= event.Capacity {
		fail(c, 409, "This event is full")
		return
	}
	result, err := tx.Exec(`INSERT INTO registrations(student_id,event_id,full_name,college_email,department,academic_year,phone,additional_info,owner_token) VALUES(?,?,?,?,?,?,?,?,?)`, in.StudentID, in.EventID, in.FullName, in.CollegeEmail, in.Department, in.AcademicYear, in.Phone, in.AdditionalInfo, ownerDigest(owner))
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique constraint") {
			fail(c, 409, "This student is already registered for this event")
		} else {
			fail(c, 500, "Could not save registration")
		}
		return
	}
	id, err := result.LastInsertId()
	if err != nil {
		fail(c, 500, "Could not finish registration")
		return
	}
	if err = tx.Commit(); err != nil {
		fail(c, 500, "Could not save registration")
		return
	}
	event.Registered++
	c.JSON(201, Registration{ID: int(id), StudentID: in.StudentID, FullName: in.FullName, CollegeEmail: in.CollegeEmail, Department: in.Department, AcademicYear: in.AcademicYear, Phone: in.Phone, AdditionalInfo: in.AdditionalInfo, RegisteredAt: time.Now().UTC().Format(time.RFC3339), Reference: registrationReference(int(id)), Event: event})
}

func registrations(c *gin.Context) {
	owner, err := guestOwner(c)
	if err != nil {
		fail(c, 500, "Could not load registrations")
		return
	}
	rows, err := db.Query(`SELECT r.id,r.student_id,r.full_name,r.college_email,r.department,r.academic_year,r.phone,r.additional_info,r.registered_at,e.id,e.title,e.description,e.category,e.event_date,e.event_time,e.venue,e.image_url,e.capacity,(SELECT count(*) FROM registrations x WHERE x.event_id=e.id) FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.owner_token=? ORDER BY e.event_date,e.event_time`, ownerDigest(owner))
	if err != nil {
		fail(c, 500, "Could not load registrations")
		return
	}
	defer rows.Close()
	out := []Registration{}
	for rows.Next() {
		var r Registration
		if err = rows.Scan(&r.ID, &r.StudentID, &r.FullName, &r.CollegeEmail, &r.Department, &r.AcademicYear, &r.Phone, &r.AdditionalInfo, &r.RegisteredAt, &r.Event.ID, &r.Event.Title, &r.Event.Description, &r.Event.Category, &r.Event.EventDate, &r.Event.EventTime, &r.Event.Venue, &r.Event.ImageURL, &r.Event.Capacity, &r.Event.Registered); err != nil {
			fail(c, 500, "Could not load registrations")
			return
		}
		r.Reference = registrationReference(r.ID)
		out = append(out, r)
	}
	if err = rows.Err(); err != nil {
		fail(c, 500, "Could not load registrations")
		return
	}
	c.JSON(200, out)
}

func cancelRegistration(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		fail(c, 400, "Invalid registration ID")
		return
	}
	owner, err := guestOwner(c)
	if err != nil {
		fail(c, 500, "Could not cancel registration")
		return
	}
	result, err := db.Exec(`DELETE FROM registrations WHERE id=? AND owner_token=?`, id, ownerDigest(owner))
	if err != nil {
		fail(c, 500, "Could not cancel registration")
		return
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		fail(c, 404, "Registration not found for this browser session")
		return
	}
	c.JSON(200, gin.H{"message": "Registration cancelled"})
}
