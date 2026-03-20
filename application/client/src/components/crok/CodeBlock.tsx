import { ComponentProps, isValidElement, ReactElement, ReactNode, useEffect, useState } from "react";
import type { default as SyntaxHighlighterType } from "react-syntax-highlighter";

const getLanguage = (children: ReactElement<ComponentProps<"code">>) => {
  const className = children.props.className;
  if (typeof className === "string") {
    const match = className.match(/language-(\w+)/);
    return match?.[1] ?? "javascript";
  }
  return "javascript";
};

const isCodeElement = (children: ReactNode): children is ReactElement<ComponentProps<"code">> =>
  isValidElement(children) && children.type === "code";

const customStyle = {
  fontSize: "14px",
  padding: "24px 16px",
  borderRadius: "8px",
  border: "1px solid var(--color-cax-border)",
};

export const CodeBlock = ({ children }: ComponentProps<"pre">) => {
  const [mod, setMod] = useState<{
    SyntaxHighlighter: typeof SyntaxHighlighterType;
    style: Record<string, React.CSSProperties>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("react-syntax-highlighter"),
      import("react-syntax-highlighter/dist/esm/styles/hljs"),
    ]).then(([highlighterMod, styleMod]) => {
      if (!cancelled) {
        setMod({
          SyntaxHighlighter: highlighterMod.default,
          style: styleMod.atomOneLight,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isCodeElement(children)) return <>{children}</>;
  const language = getLanguage(children);
  const code = children.props.children?.toString() ?? "";

  if (!mod) {
    return (
      <pre style={customStyle}>
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <mod.SyntaxHighlighter customStyle={customStyle} language={language} style={mod.style}>
      {code}
    </mod.SyntaxHighlighter>
  );
};
