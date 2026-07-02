package template

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// RenderFolder renders every file under skeletonPath, returning a map of
// (rendered) relative path -> rendered content. ".tpl" files have both their
// content and name rendered and the suffix stripped; other files are copied
// as-is except their path, which is still rendered (for e.g. "{{env}}.yaml").
func RenderFolder(skeletonPath string, values map[string]any) (map[string]string, error) {
	result := make(map[string]string)

	info, err := os.Stat(skeletonPath)
	if err != nil || !info.IsDir() {
		return nil, fmt.Errorf("skeleton directory not found: %s", skeletonPath)
	}

	err = filepath.Walk(skeletonPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		rel, err := filepath.Rel(skeletonPath, path)
		if err != nil {
			return err
		}
		rel = filepath.ToSlash(rel)

		raw, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		content := string(raw)

		if strings.HasSuffix(rel, ".tpl") {
			rel = rel[:len(rel)-len(".tpl")]
			content, err = Render(content, values)
			if err != nil {
				return fmt.Errorf("render %s: %w", path, err)
			}
		}

		rel, err = Render(rel, values)
		if err != nil {
			return fmt.Errorf("render path %s: %w", path, err)
		}
		result[rel] = content
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}
