"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import TiptapEditor from "@/components/TiptapEditor";
import { db, Project, TestRecord } from "@/lib/db";
import { useReactToPrint } from "react-to-print";
import { Printer, Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

type Props = {
  projectId: string;
  testId?: string; // If present, edit mode
};

export default function TestForm({ projectId, testId }: Props) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [test, setTest] = useState<TestRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("");
  const [functional, setFunctional] = useState("");
  const [relatedTask, setRelatedTask] = useState("");
  const [layer, setLayer] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data Management
  const [availableData, setAvailableData] = useState<Record<string, string>>(
    {}
  );
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [customData, setCustomData] = useState<
    { key: string; value: string }[]
  >([]);

  // Ref for printing
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: name || "Test Record",
  });

  useEffect(() => {
    async function loadData() {
      // Using db.projects.get instead of storage getProject
      const p = await db.projects.get(projectId);
      setProject(p || null);

      if (testId && p) {
        const t = p.tests.find((t) => t.id === testId);
        if (t) {
          setTest(t);
          setName(t.name || "");
          setEnvironment(t.environment);
          setFunctional(t.functional || "");
          setRelatedTask(t.relatedTask || "");
          setLayer(t.layer || "");
          setDate(t.date || new Date().toISOString().split("T")[0]);
          setDescriptionHtml(t.description);

          // Reconstruct data state
          const envData = p.data[t.environment] || {};
          setAvailableData(envData);

          const initialSelected = new Set<string>();
          const initialCustom: { key: string; value: string }[] = [];

          Object.entries(t.data).forEach(([k, v]) => {
            if (envData[k] === v) {
              initialSelected.add(k);
            } else {
              initialCustom.push({ key: k, value: v });
            }
          });

          setSelectedKeys(initialSelected);
          setCustomData(initialCustom);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [projectId, testId]);

  // Handle Environment Change logic
  useEffect(() => {
    if (!testId && project && environment) {
      const envData = project.data[environment] || {};
      setAvailableData(envData);
      // Default select all
      setSelectedKeys(new Set(Object.keys(envData)));
      setCustomData([]);
    }
  }, [environment, project, testId]);

  const toggleKey = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  const addCustomRow = () => {
    setCustomData([...customData, { key: "", value: "" }]);
  };

  const updateCustomRow = (
    index: number,
    field: "key" | "value",
    val: string
  ) => {
    const next = [...customData];
    next[index][field] = val;
    setCustomData(next);
  };

  const removeCustomRow = (index: number) => {
    setCustomData(customData.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !environment || !name) return;

    setIsSubmitting(true);

    // Merge data
    const finalData: Record<string, string> = {};
    selectedKeys.forEach((k) => {
      finalData[k] = availableData[k];
    });
    customData.forEach(({ key, value }) => {
      if (key) finalData[key] = value;
    });

    try {
      await db.projects
        .where("id")
        .equals(projectId)
        .modify((p) => {
          if (testId) {
            const idx = p.tests.findIndex((t) => t.id === testId);
            if (idx !== -1) {
              p.tests[idx] = {
                ...p.tests[idx],
                name,
                environment,
                functional,
                relatedTask,
                layer,
                date,
                description: descriptionHtml,
                data: finalData,
              };
            }
          } else {
            const newTest: TestRecord = {
              id: uuidv4(),
              name,
              environment,
              data: finalData,
              description: descriptionHtml,
              functional,
              relatedTask,
              layer,
              date,
              createdAt: new Date().toISOString(),
            };
            p.tests.unshift(newTest);
          }
        });

      setIsSubmitting(false);
      router.push(`/projects/${projectId}`);
      // router.refresh(); // Not strictly needed with Dexie liveQuery but safe to leave
    } catch (error) {
      console.error("Failed to save test:", error);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!project)
    return <div className="p-10 text-center">Project not found</div>;
  if (testId && !test)
    return <div className="p-10 text-center">Test not found</div>;

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/projects/${projectId}`)}
        >
          &larr; Volver
        </Button>
        {testId && (
          <Button
            onClick={() => handlePrint && handlePrint()}
            variant="secondary"
          >
            <Printer className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        )}
      </div>

      <div ref={printRef} className="print:p-8">
        <Card className="print:border-0 print:shadow-none">
          <CardHeader className="print:hidden">
            <CardTitle>{testId ? "Editar Prueba" : "Nueva Prueba"}</CardTitle>
            <CardDescription>
              {testId
                ? `Editando Prueba: ${test?.id}`
                : `Documentando para ${project.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 print:flex print:items-center print:space-y-0 print:gap-2">
                <Label
                  htmlFor="testName"
                  className="print:whitespace-nowrap print:font-bold print:text-base"
                >
                  Nombre de prueba:
                </Label>
                <div className="relative print:flex-1">
                  <input
                    id="testName"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 print:border-0 print:shadow-none print:px-0 print:h-auto print:text-base print:bg-transparent"
                    placeholder="e.g. User Login Validation"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 print:flex print:items-center print:space-y-0 print:gap-2">
                  <Label className="print:whitespace-nowrap print:font-bold">
                    Entorno:
                  </Label>
                  <Select
                    onValueChange={setEnvironment}
                    value={environment}
                    required
                  >
                    <SelectTrigger className="print:hidden">
                      <SelectValue placeholder="Selecciona entorno" />
                    </SelectTrigger>
                    <SelectContent>
                      {project.environments.map((env) => (
                        <SelectItem key={env} value={env}>
                          {env}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Print view for env */}
                  <div className="hidden print:block font-mono print:text-base">
                    {environment}
                  </div>
                </div>

                <div className="space-y-2 print:flex print:items-center print:space-y-0 print:gap-2">
                  <Label
                    htmlFor="layer"
                    className="print:whitespace-nowrap print:font-bold"
                  >
                    Capa:
                  </Label>
                  <Input
                    id="layer"
                    placeholder="front, mw, host..."
                    value={layer}
                    onChange={(e) => setLayer(e.target.value)}
                    className="print:border-0 print:shadow-none print:bg-transparent print:px-0 print:h-auto print:text-base"
                  />
                </div>

                <div className="space-y-2 print:flex print:items-center print:space-y-0 print:gap-2">
                  <Label
                    htmlFor="date"
                    className="print:whitespace-nowrap print:font-bold"
                  >
                    Fecha:
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="print:border-0 print:shadow-none print:bg-transparent print:px-0 print:h-auto print:text-base"
                  />
                </div>

                <div className="space-y-2 print:flex print:items-center print:space-y-0 print:gap-2">
                  <Label
                    htmlFor="functional"
                    className="print:whitespace-nowrap print:font-bold"
                  >
                    Funcional:
                  </Label>
                  <Input
                    id="functional"
                    placeholder="Tester Name"
                    value={functional}
                    onChange={(e) => setFunctional(e.target.value)}
                    className="print:border-0 print:shadow-none print:bg-transparent print:px-0 print:h-auto print:text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="relatedTask">Tarea Relacionada</Label>
                <Input
                  id="relatedTask"
                  placeholder="Tarea relacionada"
                  value={relatedTask}
                  onChange={(e) => setRelatedTask(e.target.value)}
                  className="print:border-0 print:px-0"
                />
              </div>

              {environment && (
                <div className="border rounded-md p-4 space-y-4">
                  <Label>Configuración de datos</Label>

                  {/* Environment Data Selection */}
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase text-muted-foreground font-bold">
                      Datos ({environment})
                    </h4>
                    {Object.keys(availableData).length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        No hay datos configurados para este entorno.
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(availableData).map(([key, value]) => (
                        <div
                          key={key}
                          className={`${
                            selectedKeys.has(key) ? "checked" : "print:hidden"
                          } flex items-center space-x-2 p-1 hover:bg-muted/50`}
                        >
                          <Checkbox
                            id={`env-key-${key}`}
                            checked={selectedKeys.has(key)}
                            onCheckedChange={() => toggleKey(key)}
                            className="print:hidden"
                          />
                          <div className="grid gap-0.5 leading-none">
                            <Label
                              htmlFor={`env-key-${key}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {key}
                            </Label>
                            <span className="text-xs text-muted-foreground font-mono">
                              {value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom Data Section */}
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs uppercase text-muted-foreground font-bold">
                        Campos personalizados
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomRow}
                        className="h-7 w-7 p-0 print:hidden rounded-full"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {customData.map((row, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          placeholder="Campo"
                          value={row.key}
                          onChange={(e) =>
                            updateCustomRow(idx, "key", e.target.value)
                          }
                          className="h-8 text-xs font-mono"
                        />
                        <Input
                          placeholder="Valor"
                          value={row.value}
                          onChange={(e) =>
                            updateCustomRow(idx, "value", e.target.value)
                          }
                          className="h-8 text-xs font-mono"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomRow(idx)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive print:hidden"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="hidden print:block print:text-xs">
                          {row.key}: {row.value}
                        </div>
                      </div>
                    ))}
                    {customData.length === 0 && (
                      <p className="text-sm text-muted-foreground italic print:hidden">
                        No campos personalizados agregados.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Descripción y evidencias</Label>
                <div className="print:hidden">
                  <TiptapEditor
                    content={descriptionHtml}
                    onChange={setDescriptionHtml}
                    placeholder="Describe the test steps, expected results, and paste any evidence..."
                  />
                </div>
                <div
                  className="hidden print:block prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              </div>

              <div className="flex justify-end gap-2 print:hidden">
                <Button
                  type="submit"
                  disabled={isSubmitting || !environment || !name}
                >
                  {isSubmitting ? "Guardando..." : "Guardar prueba"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
