import { useEffect, useMemo } from "react";

interface JsonLdProps {
  id: string;
  data: Record<string, unknown>;
}

export function JsonLd({ id, data }: JsonLdProps) {
  const json = useMemo(() => JSON.stringify(data), [data]);

  useEffect(() => {
    const scriptId = `jsonld-${id}`;
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = scriptId;
      document.head.appendChild(script);
    }

    script.text = json;

    return () => {
      script?.remove();
    };
  }, [id, json]);

  return null;
}
