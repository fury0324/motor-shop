package post

import (
	"fmt"
	"strings"

	"github.com/dimension/ai-ci-agent/internal/provider"
)

// RenderAssessment builds the PR comment body for a successful
// assessment, using the field layout shared with the PR review agent
// (§4.4) plus the CI-specific confidence field. staleHeadSHA is empty
// unless the PR's head moved since context was gathered, in which case
// §6.3 requires the comment to say so explicitly and drop inline
// anchoring.
func RenderAssessment(a provider.Assessment, reviewedSHA, staleHeadSHA string) string {
	var b strings.Builder

	b.WriteString("### 🤖 AI CI Agent — root-cause assessment\n\n")

	if staleHeadSHA != "" {
		b.WriteString(fmt.Sprintf(
			"> **Note:** this PR's head moved after context was gathered (reviewed `%s`, current head `%s`). Findings below are shown without inline file/line anchors.\n\n",
			short(reviewedSHA), short(staleHeadSHA),
		))
	}

	stale := staleHeadSHA != ""

	b.WriteString(fmt.Sprintf("**Category:** %s\n", a.Category))
	b.WriteString(fmt.Sprintf("**Severity:** %s\n", a.Severity))
	b.WriteString(fmt.Sprintf("**Confidence:** %s\n", a.Confidence))

	if !stale && a.Anchored && a.File != "" {
		b.WriteString(fmt.Sprintf("**Location:** `%s:%d`\n", a.File, a.Line))
	} else if a.File != "" {
		b.WriteString(fmt.Sprintf("**Location (unanchored):** `%s`\n", a.File))
	} else {
		b.WriteString("**Location:** not identified\n")
	}

	b.WriteString("\n**Likely cause**\n")
	b.WriteString(orNone(a.Comment))

	b.WriteString("\n\n**Suggested fix**\n")
	b.WriteString(orNone(a.SuggestedFix))

	b.WriteString("\n\n")
	b.WriteString(marker(reviewedSHA))
	return b.String()
}

// RenderFallback covers §7's "LLM provider unavailable or times out":
// post a fallback comment linking the raw logs and exit non-fatally.
func RenderFallback(runHTMLURL, sha string) string {
	var b strings.Builder
	b.WriteString("### 🤖 AI CI Agent\n\n")
	b.WriteString("The LLM provider was unavailable or timed out, so no automated root-cause assessment could be generated for this failure.\n\n")
	if runHTMLURL != "" {
		b.WriteString(fmt.Sprintf("Raw logs: %s\n\n", runHTMLURL))
	}
	b.WriteString(marker(sha))
	return b.String()
}

// RenderMinimal covers the other §7 fallback paths: rate limiting
// exhausted, or the assessment stayed malformed after the bounded
// repair attempt. reason is a short, human-readable explanation.
func RenderMinimal(reason, sha string) string {
	var b strings.Builder
	b.WriteString("### 🤖 AI CI Agent\n\n")
	b.WriteString(fmt.Sprintf("Unable to produce a full assessment for this failure: %s\n\n", reason))
	b.WriteString(marker(sha))
	return b.String()
}

func orNone(s string) string {
	if strings.TrimSpace(s) == "" {
		return "_none provided_"
	}
	return s
}

func short(sha string) string {
	if len(sha) > 7 {
		return sha[:7]
	}
	return sha
}
