package assess

import (
	"errors"
	"fmt"
	"strings"
	"testing"
)

func TestParseAssessment_PlainJSON(t *testing.T) {
	raw := `{"file":"vehicles/garage.go","line":42,"category":"ignored","severity":"P1","comment":"nil owner","suggested_fix":"check g.owner","confidence":"high","anchored":true}`

	a, err := ParseAssessment(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.Category != "ci-failure" {
		t.Errorf("category = %q, want ci-failure to be fixed regardless of input", a.Category)
	}
	if a.File != "vehicles/garage.go" || a.Line != 42 {
		t.Errorf("file/line = %q:%d, want vehicles/garage.go:42", a.File, a.Line)
	}
	if a.Severity != "P1" || a.Confidence != "high" {
		t.Errorf("severity/confidence = %q/%q, want P1/high", a.Severity, a.Confidence)
	}
}

func TestParseAssessment_FencedJSON(t *testing.T) {
	raw := "Here is my assessment:\n```json\n{\"file\":\"a.go\",\"line\":1,\"category\":\"ci-failure\",\"severity\":\"P2\",\"comment\":\"x\",\"suggested_fix\":\"\",\"confidence\":\"low\",\"anchored\":false}\n```\nLet me know if you need more.\n"

	a, err := ParseAssessment(raw)
	if err != nil {
		t.Fatalf("unexpected error extracting fenced JSON: %v", err)
	}
	if a.File != "a.go" || a.Severity != "P2" {
		t.Errorf("got %+v", a)
	}
}

func TestParseAssessment_InvalidSeverity(t *testing.T) {
	raw := `{"file":"a.go","line":1,"category":"ci-failure","severity":"critical","comment":"x","suggested_fix":"","confidence":"low","anchored":false}`
	if _, err := ParseAssessment(raw); err == nil {
		t.Fatal("expected an error for an out-of-enum severity, got nil")
	}
}

func TestParseAssessment_InvalidConfidence(t *testing.T) {
	raw := `{"file":"a.go","line":1,"category":"ci-failure","severity":"P1","comment":"x","suggested_fix":"","confidence":"certain","anchored":false}`
	if _, err := ParseAssessment(raw); err == nil {
		t.Fatal("expected an error for an out-of-enum confidence, got nil")
	}
}

func TestParseAssessment_NoJSONFound(t *testing.T) {
	if _, err := ParseAssessment("I couldn't figure this one out, sorry."); err == nil {
		t.Fatal("expected an error when no JSON object is present")
	}
}

func TestParseAssessment_MissingFileForcesUnanchored(t *testing.T) {
	raw := `{"file":"","line":0,"category":"ci-failure","severity":"P1","comment":"x","suggested_fix":"","confidence":"medium","anchored":true}`
	a, err := ParseAssessment(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.Anchored {
		t.Error("anchored should be forced false when file/line are empty, regardless of what the model claimed")
	}
}

// ErrMalformed is a sentinel cmd/agent relies on via errors.Is to decide
// whether to post a minimal comment (§7). ClaudeProvider/OpenAIProvider
// wrap it with fmt.Errorf("%w: ...", ErrMalformed) — confirm that survives
// unwrapping the way errors.Is expects.
func TestErrMalformed_SurvivesWrapping(t *testing.T) {
	plain := errors.New("outer: " + ErrMalformed.Error())
	if errors.Is(plain, ErrMalformed) {
		t.Fatal("sanity check: a string-built error should NOT satisfy errors.Is without %w wrapping")
	}

	wrapped := fmt.Errorf("%w: some parse detail", ErrMalformed)
	if !errors.Is(wrapped, ErrMalformed) {
		t.Fatal("an error built with %w around ErrMalformed must satisfy errors.Is(err, ErrMalformed)")
	}
}

func TestExtractJSONObject_IgnoresSurroundingProse(t *testing.T) {
	raw := `Sure thing! {"file":"x","line":1,"category":"ci-failure","severity":"P1","comment":"c","suggested_fix":"","confidence":"low","anchored":false} Hope that helps.`
	got := extractJSONObject(raw)
	if !strings.HasPrefix(got, "{") || !strings.HasSuffix(got, "}") {
		t.Fatalf("extractJSONObject did not isolate the object: %q", got)
	}
}
