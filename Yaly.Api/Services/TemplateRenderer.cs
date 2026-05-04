using Scriban;
using Scriban.Runtime;

namespace Yaly.Api.Services;

public class TemplateRenderer
{
    public Dictionary<string, string> RenderTemplateFolder(string skeletonPath, Dictionary<string, object> values)
    {
        var result = new Dictionary<string, string>();
        var context = BuildContext(values);

        if (!Directory.Exists(skeletonPath))
        {
            throw new DirectoryNotFoundException($"Skeleton directory not found: {skeletonPath}");
        }

        foreach (var file in Directory.GetFiles(skeletonPath, "*", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(skeletonPath, file);
            var content = File.ReadAllText(file);

            if (file.EndsWith(".tpl", StringComparison.OrdinalIgnoreCase))
            {
                relativePath = relativePath[..^4];
                content = RenderParsedTemplate(content, context);
            }

            relativePath = RenderParsedTemplate(relativePath, context);
            result[relativePath] = content;
        }

        return result;
    }

    public string RenderString(string templateStr, Dictionary<string, object> values)
        => RenderParsedTemplate(templateStr, BuildContext(values));

    private static TemplateContext BuildContext(Dictionary<string, object> values)
    {
        var scriptObject = new ScriptObject();
        foreach (var (key, value) in values)
        {
            scriptObject.Add(key, value);
        }

        var context = new TemplateContext();
        context.PushGlobal(scriptObject);
        return context;
    }

    private static string RenderParsedTemplate(string input, TemplateContext context)
    {
        var template = Template.Parse(input);
        if (template.HasErrors)
        {
            throw new InvalidOperationException(string.Join(Environment.NewLine, template.Messages.Select(message => message.Message)));
        }

        return template.Render(context);
    }
}
