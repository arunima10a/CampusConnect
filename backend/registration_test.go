package main

import "testing"

func TestNormalizeRegistration(t *testing.T) {
	in := registrationInput{EventID: 1, FullName: "  Taylor   Student ", StudentID: " T001 ", CollegeEmail: " TAYLOR@COLLEGE.EDU ", Department: "Information Technology", AcademicYear: "2nd Year", Phone: " +1 555-111-2222 ", AdditionalInfo: "  access needs  "}
	if fields := normalizeRegistration(&in); len(fields) != 0 {
		t.Fatalf("valid registration had errors: %#v", fields)
	}
	if in.FullName != "Taylor Student" || in.StudentID != "T001" || in.CollegeEmail != "taylor@college.edu" || in.AdditionalInfo != "access needs" {
		t.Fatalf("registration values were not normalized: %#v", in)
	}
}

func TestNormalizeRegistrationRejectsMalformedFields(t *testing.T) {
	in := registrationInput{EventID: 1, FullName: " ", StudentID: " ", CollegeEmail: "not-an-email", Department: "Unknown", AcademicYear: "Year 9", Phone: "bad"}
	fields := normalizeRegistration(&in)
	for _, field := range []string{"fullName", "studentId", "collegeEmail", "department", "academicYear", "phone"} {
		if fields[field] == "" {
			t.Errorf("expected a validation message for %s", field)
		}
	}
}

func TestRegistrationReferenceIsStable(t *testing.T) {
	if got := registrationReference(42); got != "CC-000042" {
		t.Fatalf("unexpected reference: %s", got)
	}
	if got := registrationReference(1234567); got != "CC-1234567" {
		t.Fatalf("large IDs remain stable: %s", got)
	}
}

func TestOwnerDigestDoesNotStoreRawToken(t *testing.T) {
	token := "a long random browser secret"
	digest := ownerDigest(token)
	if digest == token || len(digest) != 64 {
		t.Fatalf("expected a SHA-256 hex digest, got %q", digest)
	}
	if digest != ownerDigest(token) {
		t.Fatal("owner digest must be stable for lookup")
	}
}
