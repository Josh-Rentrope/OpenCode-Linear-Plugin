/**
 * OpenCode Reference Detector
 * 
 * Simple detection of @opencode mentions in Linear comments.
 * This is intentionally minimal - downstream agents can handle
 * specific command parsing based on their project needs.
 */

export interface OpenCodeReference {
  /** The raw @opencode mention found in the comment */
  raw: string
  /** Position where the mention starts and ends in the original text */
  position: { start: number; end: number }
  /** The full comment text for context */
  context: string
}

export class OpenCodeReferenceDetector {
/**
 * Pattern to find @opencode mentions and commands
 * Captures each @opencode reference up to the next @opencode or end of line
 */
private static readonly OPENCODE_PATTERN = /@opencode\b[^@]*(?=@opencode|$)/gi

  /**
   * Detect all @opencode mentions in a comment
   * 
   * @param comment - The comment text to search through
   * @returns Array of found references with position and context
   */
  static detectReferences(comment: string): OpenCodeReference[] {
    const references: OpenCodeReference[] = []
    let match

    // Reset regex to start fresh
    this.OPENCODE_PATTERN.lastIndex = 0

    while ((match = this.OPENCODE_PATTERN.exec(comment)) !== null) {
      references.push({
        raw: match[0],
        position: {
          start: match.index,
          end: match.index + match[0].length
        },
        context: comment.trim()
      })
    }

    return references
  }

  /**
   * Quick check if a comment contains any @opencode mentions
   * 
   * @param comment - The comment text to check
   * @returns True if @opencode is found, false otherwise
   */
  static hasOpenCodeReference(comment: string): boolean {
    this.OPENCODE_PATTERN.lastIndex = 0
    return this.OPENCODE_PATTERN.test(comment)
  }
}

// Export singleton for easy usage
export const opencodeReferenceDetector = OpenCodeReferenceDetector