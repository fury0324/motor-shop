package assess

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

// ErrMalformed is returned when a provider's output could not be parsed
// into an Assessment even after the bounded repair attempt (§7:
// "if that also fails, a minimal body-only comment is posted rather than
// the finding being silently dropped"). Callers should errors.Is against
// this to decide whether to fall back to a minimal comment.
var ErrMalformed = errors.New("assess: assessment malformed after repair attempt")

var fencedJSON = regexp.MustCompile("(?s)```(?:json)?\\s*(\\{.*?\\})\\s*```")

var validSeverity = map[string]bool{"P0": true, "P1": true, "P2": true, "P3": true, "nit": true}
var validConfidence = map[string]bool{"high": true, "medium": true, "low": true}

// ParseAssessment extracts and validates a JSON Assessment from raw LLM
// output. It tolerates the model wrapping the object in a markdown code
// fence, or emitting leading/trailing prose around the object, since
// providers don't reliably honor "no prose" instructions.
func ParseAssessment(raw string) (Assessment, error) {
	candidate := extractJSONObject(raw)
	if candidate == "" {
		return Assessment{}, fmt.Errorf("assess: no JSON object found in response")
	}

	var a Assessment
	if err := json.Unmarshal([]byte(candidate), &a); err != nil {
		return Assessment{}, fmt.Errorf("assess: invalid JSON: %w", err)
	}

	a.Category = "ci-failure" // fixed per §4.4, regardless of what the model returned

	if !validSeverity[a.Severity] {
		return Assessment{}, fmt.Errorf("assess: invalid severity %q", a.Severity)
	}
	if !validConfidence[a.Confidence] {
		return Assessment{}, fmt.Errorf("assess: invalid confidence %q", a.Confidence)
	}
	if a.File == "" || a.Line <= 0 {
		a.Anchored = false
	}

	return a, nil
}

// extractJSONObject pulls the first plausible JSON object out of raw
// text: a fenced block if present, otherwise the outermost {...} span.
func extractJSONObject(raw string) string {
	raw = strings.TrimSpace(raw)
	if m := fencedJSON.FindStringSubmatch(raw); m != nil {
		return m[1]
	}
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start == -1 || end == -1 || end < start {
		return ""
	}
	return raw[start : end+1]
}
