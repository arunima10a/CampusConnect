package main

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"net/http"
	"net/mail"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

const (
	adminCookie = "campusconnect_admin"
	csrfCookie  = "campusconnect_csrf"
	ownerCookie = "campusconnect_guest"
	sessionLife = 8 * time.Hour
)

type adminSession struct {
	Email string
	Role  string
	Until time.Time
}
type loginAttempt struct {
	Started time.Time
	Count   int
}

var (
	adminEmail string
	adminHash  []byte
	dummyHash  []byte
	sessions   = map[string]adminSession{}
	sessionMu  sync.Mutex
	loginMu    sync.Mutex
	loginHits  = map[string]loginAttempt{}
)

func initAdmin() {
	adminEmail = strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL")))
	password := os.Getenv("ADMIN_PASSWORD")
	if adminEmail == "" || len(password) < 10 || len(password) > 72 {
		panic("ADMIN_EMAIL and ADMIN_PASSWORD (10–72 characters) must be set")
	}
	var err error
	adminHash, err = bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		panic("could not initialise administrator password hash")
	}
	dummyHash, _ = bcrypt.GenerateFromPassword([]byte("invalid-placeholder-password"), bcrypt.MinCost)
}
func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
func secureCookie() bool {
	return strings.EqualFold(os.Getenv("APP_ENV"), "production") || strings.EqualFold(os.Getenv("SECURE_COOKIES"), "true")
}
func setCookie(c *gin.Context, name, value string, maxAge int, httpOnly bool) {
	http.SetCookie(c.Writer, &http.Cookie{Name: name, Value: value, Path: "/api", MaxAge: maxAge, Expires: time.Now().Add(time.Duration(maxAge) * time.Second), HttpOnly: httpOnly, Secure: secureCookie(), SameSite: http.SameSiteStrictMode})
}
func csrfValue(c *gin.Context) string {
	v, err := c.Cookie(csrfCookie)
	if err != nil {
		return ""
	}
	return v
}
func verifyCSRF(c *gin.Context) bool {
	cookie, header := csrfValue(c), c.GetHeader("X-CSRF-Token")
	return cookie != "" && len(cookie) == len(header) && subtle.ConstantTimeCompare([]byte(cookie), []byte(header)) == 1
}
func adminCSRF(c *gin.Context) {
	if !verifyCSRF(c) {
		fail(c, 403, "Request verification failed. Refresh and try again.")
		c.Abort()
		return
	}
	c.Next()
}
func adminAuth(c *gin.Context) {
	token, err := c.Cookie(adminCookie)
	if err != nil || token == "" {
		if guest, guestErr := c.Cookie(ownerCookie); guestErr == nil && len(guest) == 64 {
			fail(c, 403, "Administrator access is required")
		} else {
			fail(c, 401, "Administrator sign-in is required")
		}
		c.Abort()
		return
	}
	sessionMu.Lock()
	session, ok := sessions[token]
	if ok && time.Now().After(session.Until) {
		delete(sessions, token)
		ok = false
	}
	sessionMu.Unlock()
	if !ok {
		fail(c, 401, "Administrator sign-in is required")
		c.Abort()
		return
	}
	if session.Role != "admin" {
		fail(c, 403, "Administrator access is required")
		c.Abort()
		return
	}
	c.Set("adminEmail", session.Email)
	c.Next()
}
func csrfEndpoint(c *gin.Context) {
	token, err := randomToken()
	if err != nil {
		fail(c, 500, "Could not prepare secure sign-in")
		return
	}
	setCookie(c, csrfCookie, token, int(sessionLife.Seconds()), false)
	c.JSON(200, gin.H{"csrfToken": token})
}
func login(c *gin.Context) {
	ip := c.ClientIP()
	loginMu.Lock()
	attempt := loginHits[ip]
	if time.Since(attempt.Started) > time.Minute {
		attempt = loginAttempt{Started: time.Now()}
	}
	if attempt.Count >= 5 {
		loginMu.Unlock()
		fail(c, 429, "Too many sign-in attempts. Try again in one minute.")
		return
	}
	attempt.Count++
	loginHits[ip] = attempt
	loginMu.Unlock()
	if !verifyCSRF(c) {
		fail(c, 403, "Request verification failed. Refresh and try again.")
		return
	}
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if c.ShouldBindJSON(&input) != nil || len(input.Email) > 254 || len(input.Password) > 1024 || strings.TrimSpace(input.Email) == "" || input.Password == "" {
		fail(c, 400, "Enter a valid email address and password")
		return
	}
	emailInput := strings.TrimSpace(input.Email)
	address, emailErr := mail.ParseAddress(emailInput)
	if emailErr != nil || address.Address != emailInput {
		fail(c, 400, "Enter a valid email address and password")
		return
	}
	email := strings.ToLower(strings.TrimSpace(input.Email))
	err := bcrypt.CompareHashAndPassword(dummyHash, []byte(input.Password))
	if email == adminEmail {
		err = bcrypt.CompareHashAndPassword(adminHash, []byte(input.Password))
	} else {
		_ = bcrypt.CompareHashAndPassword(adminHash, []byte(input.Password))
	}
	if email != adminEmail || err != nil {
		fail(c, 401, "Invalid email or password")
		return
	}
	token, err := randomToken()
	if err != nil {
		fail(c, 500, "Could not start administrator session")
		return
	}
	sessionMu.Lock()
	sessions[token] = adminSession{Email: adminEmail, Role: "admin", Until: time.Now().Add(sessionLife)}
	sessionMu.Unlock()
	setCookie(c, adminCookie, token, int(sessionLife.Seconds()), true)
	loginMu.Lock()
	delete(loginHits, ip)
	loginMu.Unlock()
	c.JSON(200, gin.H{"authenticated": true, "email": adminEmail, "role": "admin"})
}
func adminSessionInfo(c *gin.Context) {
	email, _ := c.Get("adminEmail")
	c.JSON(200, gin.H{"authenticated": true, "email": email, "role": "admin"})
}
func logout(c *gin.Context) {
	if token, err := c.Cookie(adminCookie); err == nil {
		sessionMu.Lock()
		delete(sessions, token)
		sessionMu.Unlock()
	}
	setCookie(c, adminCookie, "", -1, true)
	setCookie(c, csrfCookie, "", -1, false)
	c.JSON(200, gin.H{"authenticated": false})
}
func guestOwner(c *gin.Context) (string, error) {
	token, err := c.Cookie(ownerCookie)
	if err != nil || len(token) != 64 {
		token, err = randomToken()
		if err != nil {
			return "", err
		}
		setCookie(c, ownerCookie, token, int((365 * 24 * time.Hour).Seconds()), true)
	}
	return token, nil
}
