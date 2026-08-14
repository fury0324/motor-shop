// Package assess owns the prompt sent to an LLM provider and the parsing
// (with one bounded repair attempt, §7) of what comes back. It is the one
// place prompt wording and the JSON contract live, so ClaudeProvider and
// OpenAIProvider don't each carry their own copy.
//
// The Assessment/AssessmentRequest struct definitions live here rather
// than in internal/provider to avoid an import cycle: both concrete
// providers need to call BuildPrompt/ParseAssessment, so provider must
// import assess, not the other way around. internal/provider re-exports
// these two types via type aliases so callers can keep writing
// provider.Assessment per §4.2 without knowing about the split.
package assess

// AssessmentRequest carries everything gathered for one CI failure.
type AssessmentRequest struct {
	LogTail     string
	FailedTests string
	Diff        string
	Files       map[string]string
}

// Assessment is the structured root-cause finding a provider returns. The
// shape intentionally reuses the PR review agent's finding schema rather
// than inventing a parallel one — see §4.4 for the field mapping.
type Assessment struct {
	File         string `json:"file"`
	Line         int    `json:"line"`
	Category     string `json:"category"` // "ci-failure" (fixed for this agent)
	Severity     string `json:"severity"` // P0 | P1 | P2 | P3 | nit
	Comment      string `json:"comment"`  // the likely cause, in prose
	SuggestedFix string `json:"suggested_fix"`
	Confidence   string `json:"confidence"` // high | medium | low — CI-agent-specific, see §4.4
	Anchored     bool   `json:"anchored"`   // true only if file/line fall inside the captured diff/log
}
