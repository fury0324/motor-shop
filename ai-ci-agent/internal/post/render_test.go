package post

import (
	"strings"
	"testing"

	"github.com/dimension/ai-ci-agent/internal/provider"
)

func TestRenderAssessment_IncludesMarkerForSHA(t *testing.T) {
	a := provider.Assessment{
		File: "vehicles/garage.go", Line: 41, Category: "ci-failure",
		Severity: "P1", Comment: "nil owner check", SuggestedFix: "check g == nil first",
		Confidence: "high", Anchored: true,
	}

	body := RenderAssessment(a, "abc1234", "")

	if !strings.Contains(body, marker("abc1234")) {
		t.Error("rendered comment must embed the marker for its own SHA, for §6.3 idempotency lookup")
	}
	if !strings.Contains(body, "vehicles/garage.go:41") {
		t.Errorf("expected an inline anchor for an anchored finding, got:\n%s", body)
	}
	if !strings.Contains(body, "P1") || !strings.Contains(body, "high") {
		t.Errorf("expected severity and confidence to be rendered, got:\n%s", body)
	}
}

func TestRenderAssessment_UnanchoredOmitsLineNumber(t *testing.T) {
	a := provider.Assessment{
		File: "vehicles/garage.go", Line: 999, Category: "ci-failure",
		Severity: "P1", Comment: "unclear", Confidence: "low", Anchored: false,
	}

	body := RenderAssessment(a, "abc1234", "")

	if strings.Contains(body, "vehicles/garage.go:999") {
		t.Errorf("an unanchored finding must not be rendered as a precise file:line anchor, got:\n%s", body)
	}
	if !strings.Contains(body, "vehicles/garage.go") {
		t.Errorf("the file should still be mentioned even when unanchored, got:\n%s", body)
	}
}

func TestRenderAssessment_StaleHeadDropsAnchorAndNotes(t *testing.T) {
	a := provider.Assessment{
		File: "vehicles/garage.go", Line: 41, Category: "ci-failure",
		Severity: "P1", Comment: "nil owner check", Confidence: "high", Anchored: true,
	}

	body := RenderAssessment(a, "abc1234", "def5678")

	if strings.Contains(body, "vehicles/garage.go:41") {
		t.Errorf("§6.3: a stale-head comment must not carry a precise inline anchor, got:\n%s", body)
	}
	if !strings.Contains(body, "abc1234") || !strings.Contains(body, "def5678") {
		t.Errorf("expected both the reviewed and current SHA to be called out, got:\n%s", body)
	}
	if !strings.Contains(body, marker("abc1234")) {
		t.Error("the marker must still key off the reviewed SHA, not the current head, so idempotency lookup for this run still works")
	}
}

func TestRenderFallback_LinksRunAndEmbedsMarker(t *testing.T) {
	body := RenderFallback("https://github.com/o/r/actions/runs/123", "abc1234")

	if !strings.Contains(body, "https://github.com/o/r/actions/runs/123") {
		t.Errorf("expected the raw run URL to be linked, got:\n%s", body)
	}
	if !strings.Contains(body, marker("abc1234")) {
		t.Error("fallback comment must still embed the marker so it isn't posted twice")
	}
}

func TestRenderMinimal_IncludesReasonAndMarker(t *testing.T) {
	body := RenderMinimal("the GitHub API rate limit was hit while gathering context", "abc1234")

	if !strings.Contains(body, "rate limit") {
		t.Errorf("expected the reason to be rendered, got:\n%s", body)
	}
	if !strings.Contains(body, marker("abc1234")) {
		t.Error("minimal comment must still embed the marker so it isn't posted twice")
	}
}

func TestMarker_DiffersBySHA(t *testing.T) {
	if marker("abc1234") == marker("def5678") {
		t.Error("markers for different SHAs must differ, or idempotency lookup would collide across commits")
	}
	if marker("abc1234") != marker("abc1234") {
		t.Error("marker must be deterministic for the same SHA")
	}
}
