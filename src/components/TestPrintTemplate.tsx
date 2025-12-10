import { TestRecord, db } from "@/lib/db";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";

interface TestPrintTemplateProps {
  test: TestRecord;
  projectName?: string;
}

export const TestPrintTemplate = ({
  test,
  projectName,
}: TestPrintTemplateProps) => {
  const settings = useLiveQuery(() => db.settings.get("global"));

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6 print:block hidden">
      <div className="border-b pb-4 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-muted-foreground">
              {projectName ? `Proyecto: ${projectName}` : ""}
            </p>
            <h1 className="text-lg max-w-[40rem] font-bold mb-2">
              {test.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Fecha creación: {format(new Date(test.createdAt), "dd/MM/yyyy")}
            </p>
          </div>
          {settings?.logo && (
            <img
              src={settings.logo}
              alt="Logo"
              className="h-16 w-auto object-contain"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-1">
            Capa
          </h3>
          <p>{test.layer || "-"}</p>
        </div>
        <div>
          <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-1">
            Entorno
          </h3>
          <p>{test.environment || "-"}</p>
        </div>
        <div>
          <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-1">
            Funcional
          </h3>
          <p>{test.functional || "-"}</p>
        </div>
        <div>
          <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-1">
            Tarea relacionada
          </h3>
          <p className="text-xs text-muted-foreground">
            {test.relatedTasks?.length
              ? test.relatedTasks.join(", ")
              : test.relatedTask || "-"}
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-1">
            Fecha de realización
          </h3>
          <p>{test.date || "-"}</p>
        </div>
      </div>

      {Object.keys(test.data).length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-3 border-b pb-1">
            Configuración de datos
          </h3>
          <div className="bg-muted/10 rounded-md p-3 border border-zinc-200 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {Object.entries(test.data).map(([key, value]) => (
              <div
                key={key}
                className="flex justify-between border-b border-dashed border-muted-foreground/20 pb-1"
              >
                <span className="font-medium">{key}</span>
                <span className="font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {test.description && (
        <div>
          <h3 className="font-bold text-lg mb-3 border-b pb-1">
            Descripción & evidencia
          </h3>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: test.description }}
          />
        </div>
      )}
    </div>
  );
};
