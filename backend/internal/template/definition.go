// Package template loads catalog form.yaml definitions and renders skeleton
// folders using the minimal Scriban-syntax subset the templates rely on.
package template

// Definition mirrors the catalog's form.yaml shape (apiVersion: yaly/v1, kind: Template).
type Definition struct {
	APIVersion string   `yaml:"apiVersion" json:"apiVersion"`
	Kind       string   `yaml:"kind" json:"kind"`
	Metadata   Metadata `yaml:"metadata" json:"metadata"`
	Spec       Spec     `yaml:"spec" json:"spec"`
}

type Metadata struct {
	Name        string `yaml:"name" json:"name"`
	Title       string `yaml:"title" json:"title"`
	Description string `yaml:"description" json:"description"`
	Icon        string `yaml:"icon" json:"icon"`
	ServiceType string `yaml:"serviceType" json:"serviceType"`
}

type Spec struct {
	Owner            string  `yaml:"owner" json:"owner"`
	Inputs           []Input `yaml:"inputs" json:"inputs"`
	Output           Output  `yaml:"output" json:"output"`
	ApprovalRequired bool    `yaml:"approvalRequired" json:"approvalRequired"`
	NameInput        string  `yaml:"nameInput" json:"nameInput"`
}

type Input struct {
	ID          string   `yaml:"id" json:"id"`
	Title       string   `yaml:"title" json:"title"`
	Type        string   `yaml:"type" json:"type"`
	Required    bool     `yaml:"required" json:"required"`
	Pattern     string   `yaml:"pattern" json:"pattern"`
	Description string   `yaml:"description" json:"description"`
	Default     any      `yaml:"default" json:"default"`
	Options     []string `yaml:"options" json:"options"`
	Min         *int     `yaml:"min" json:"min"`
	Max         *int     `yaml:"max" json:"max"`
}

type Output struct {
	Preset   string  `yaml:"preset" json:"preset"`
	Target   Target  `yaml:"target" json:"target"`
	GitHub   *GitHub `yaml:"github" json:"github"`
	Template string  `yaml:"template" json:"template"`
}

type Target struct {
	Type          string `yaml:"type" json:"type"`
	Repo          string `yaml:"repo" json:"repo"`
	Branch        string `yaml:"branch" json:"branch"`
	Path          string `yaml:"path" json:"path"`
	CommitMessage string `yaml:"commitMessage" json:"commitMessage"`
}

type GitHub struct {
	TokenEnv string `yaml:"tokenEnv" json:"tokenEnv"`
}
