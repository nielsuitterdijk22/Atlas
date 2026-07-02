package template

import (
	"fmt"
	"strings"
)

// Render renders a template string against values, supporting {{ var }}
// interpolation and {{ if cond }}...{{ else if cond }}...{{ else }}...{{ end }}
// blocks with == / != string comparisons — the only Scriban constructs the
// catalog's .tpl files use (verified by reading every file under catalog/).
// This is a small hand-written subset, not a general templating engine:
// pulling in a Liquid/Jinja-style Go library would use different
// delimiters/keywords and silently break every existing template.
func Render(input string, values map[string]any) (string, error) {
	nodes, _, term, _, err := parseNodes(tokenize(input), 0)
	if err != nil {
		return "", err
	}
	if term != "" {
		return "", fmt.Errorf("unexpected {{ %s }} with no matching {{ if }}", term)
	}
	var sb strings.Builder
	if err := renderNodes(&sb, nodes, values); err != nil {
		return "", err
	}
	return sb.String(), nil
}

type nodeKind int

const (
	nodeText nodeKind = iota
	nodeExpr
	nodeIf
)

type node struct {
	kind     nodeKind
	text     string     // nodeText
	expr     string     // nodeExpr: identifier to output
	branches []ifBranch // nodeIf
}

// ifBranch is one arm of an if/else-if/else chain. cond == "" marks the
// trailing else (always taken if reached).
type ifBranch struct {
	cond     string
	children []node
}

type token struct {
	isTag bool
	text  string
}

func tokenize(input string) []token {
	var tokens []token
	i := 0
	for i < len(input) {
		start := strings.Index(input[i:], "{{")
		if start == -1 {
			tokens = append(tokens, token{false, input[i:]})
			break
		}
		start += i
		if start > i {
			tokens = append(tokens, token{false, input[i:start]})
		}
		end := strings.Index(input[start:], "}}")
		if end == -1 {
			tokens = append(tokens, token{false, input[start:]})
			break
		}
		end += start
		tokens = append(tokens, token{true, strings.TrimSpace(input[start+2 : end])})
		i = end + 2
	}
	return tokens
}

// parseNodes parses a sequence of nodes starting at pos, stopping at end of
// input or at an "else"/"else if ..."/"end" tag it doesn't own. It returns the
// parsed nodes, the position just after the terminating tag (or len(tokens)),
// which terminator was hit ("", "else", "elseif", or "end"), and — for
// "elseif" — the following condition text.
func parseNodes(tokens []token, pos int) (nodes []node, next int, term string, termCond string, err error) {
	for pos < len(tokens) {
		tok := tokens[pos]
		if !tok.isTag {
			nodes = append(nodes, node{kind: nodeText, text: tok.text})
			pos++
			continue
		}

		switch {
		case tok.text == "end":
			return nodes, pos + 1, "end", "", nil
		case tok.text == "else":
			return nodes, pos + 1, "else", "", nil
		case strings.HasPrefix(tok.text, "else if "):
			return nodes, pos + 1, "elseif", strings.TrimSpace(strings.TrimPrefix(tok.text, "else if ")), nil
		case strings.HasPrefix(tok.text, "if "):
			cond := strings.TrimSpace(strings.TrimPrefix(tok.text, "if "))
			ifNode, newPos, perr := parseIfChain(tokens, pos+1, cond)
			if perr != nil {
				return nil, 0, "", "", perr
			}
			nodes = append(nodes, ifNode)
			pos = newPos
		default:
			nodes = append(nodes, node{kind: nodeExpr, expr: tok.text})
			pos++
		}
	}
	return nodes, pos, "", "", nil
}

// parseIfChain parses the branches of an if/else-if/else block. pos points
// just after the initiating "{{ if cond }}" tag; firstCond is that tag's
// condition.
func parseIfChain(tokens []token, pos int, firstCond string) (node, int, error) {
	var branches []ifBranch
	cond := firstCond
	for {
		children, next, term, termCond, err := parseNodes(tokens, pos)
		if err != nil {
			return node{}, 0, err
		}
		branches = append(branches, ifBranch{cond: cond, children: children})
		pos = next
		switch term {
		case "end":
			return node{kind: nodeIf, branches: branches}, pos, nil
		case "else":
			// The else body runs until "end"; represent it as a branch with no condition.
			elseChildren, next2, term2, _, err2 := parseNodes(tokens, pos)
			if err2 != nil {
				return node{}, 0, err2
			}
			if term2 != "end" {
				return node{}, 0, fmt.Errorf("expected {{ end }} after {{ else }}")
			}
			branches = append(branches, ifBranch{cond: "", children: elseChildren})
			return node{kind: nodeIf, branches: branches}, next2, nil
		case "elseif":
			cond = termCond
			continue
		default:
			return node{}, 0, fmt.Errorf("unterminated {{ if }} block")
		}
	}
}

func renderNodes(sb *strings.Builder, nodes []node, values map[string]any) error {
	for _, n := range nodes {
		switch n.kind {
		case nodeText:
			sb.WriteString(n.text)
		case nodeExpr:
			v, err := evalValue(n.expr, values)
			if err != nil {
				return err
			}
			sb.WriteString(toString(v))
		case nodeIf:
			for _, b := range n.branches {
				if b.cond == "" {
					// else — always taken if reached.
					if err := renderNodes(sb, b.children, values); err != nil {
						return err
					}
					break
				}
				ok, err := evalCondition(b.cond, values)
				if err != nil {
					return err
				}
				if ok {
					if err := renderNodes(sb, b.children, values); err != nil {
						return err
					}
					break
				}
			}
		}
	}
	return nil
}

// evalCondition evaluates "identifier == \"literal\"" or "identifier != \"literal\"".
func evalCondition(cond string, values map[string]any) (bool, error) {
	for _, op := range []string{"==", "!="} {
		if idx := strings.Index(cond, op); idx != -1 {
			left := strings.TrimSpace(cond[:idx])
			right := strings.TrimSpace(cond[idx+len(op):])
			leftVal, err := evalValue(left, values)
			if err != nil {
				return false, err
			}
			rightVal := unquote(right)
			eq := toString(leftVal) == rightVal
			if op == "!=" {
				return !eq, nil
			}
			return eq, nil
		}
	}
	// A bare identifier is truthy if its value is non-empty/non-false.
	v, err := evalValue(strings.TrimSpace(cond), values)
	if err != nil {
		return false, err
	}
	switch t := v.(type) {
	case bool:
		return t, nil
	case string:
		return t != "", nil
	case nil:
		return false, nil
	default:
		return true, nil
	}
}

// evalValue resolves an identifier against values, or returns a quoted string
// literal verbatim.
func evalValue(expr string, values map[string]any) (any, error) {
	expr = strings.TrimSpace(expr)
	if expr == "" {
		return nil, fmt.Errorf("empty expression")
	}
	if (strings.HasPrefix(expr, `"`) && strings.HasSuffix(expr, `"`)) ||
		(strings.HasPrefix(expr, "'") && strings.HasSuffix(expr, "'")) {
		return unquote(expr), nil
	}
	v, ok := values[expr]
	if !ok {
		return "", nil // Scriban renders unknown identifiers as empty.
	}
	return v, nil
}

func unquote(s string) string {
	if len(s) >= 2 {
		if (s[0] == '"' && s[len(s)-1] == '"') || (s[0] == '\'' && s[len(s)-1] == '\'') {
			return s[1 : len(s)-1]
		}
	}
	return s
}

func toString(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case bool:
		if t {
			return "true"
		}
		return "false"
	default:
		return fmt.Sprintf("%v", t)
	}
}
