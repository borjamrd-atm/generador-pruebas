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
import {
  createTest,
  updateTest,
  getProject,
  Project,
  TestRecord,
} from "@/lib/storage";
import { useReactToPrint } from "react-to-print";
import { Printer, Plus, Trash2 } from "lucide-react";

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
      const p = await getProject(projectId);
      setProject(p || null);

      if (testId && p) {
        const t = p.tests.find((t) => t.id === testId);
        if (t) {
          setTest(t);
          setName(t.name || "");
          setEnvironment(t.environment);
          setFunctional(t.functional || "");
          setRelatedTask(t.relatedTask || "");
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

    if (testId) {
      await updateTest(projectId, testId, {
        name,
        environment,
        functional,
        relatedTask,
        description: descriptionHtml,
        data: finalData,
      });
    } else {
      await createTest(
        projectId,
        name,
        environment,
        finalData,
        descriptionHtml,
        functional,
        relatedTask
      );
    }

    setIsSubmitting(false);
    router.push(`/projects/${projectId}`);
    router.refresh();
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
          &larr; Back
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
          <CardHeader>
            <CardTitle>
              {testId ? "Edit Test Record" : "Record New Test"}
            </CardTitle>
            <CardDescription>
              {testId
                ? `Viewing record: ${test?.id}`
                : `Documenting for ${project.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="testName">Test Name</Label>
                <div className="relative">
                  <input
                    id="testName"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 print:border-0 print:px-0 print:font-bold print:text-xl"
                    placeholder="e.g. User Login Validation"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select
                    onValueChange={setEnvironment}
                    value={environment}
                    required
                    disabled={!!testId}
                  >
                    <SelectTrigger className="print:hidden">
                      <SelectValue placeholder="Select Environment" />
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
                  <div className="hidden print:block font-mono mb-2">
                    Environment: {environment}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="functional">Funcional</Label>
                  <Input
                    id="functional"
                    placeholder="Tester Name"
                    value={functional}
                    onChange={(e) => setFunctional(e.target.value)}
                    className="print:border-0 print:px-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="relatedTask">Tarea Relacionada</Label>
                <Input
                  id="relatedTask"
                  placeholder="Task ID or Link"
                  value={relatedTask}
                  onChange={(e) => setRelatedTask(e.target.value)}
                  className="print:border-0 print:px-0"
                />
              </div>

              {environment && (
                <div className="border rounded-md p-4 space-y-4">
                  <Label>Data Configuration</Label>

                  {/* Environment Data Selection */}
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase text-muted-foreground font-bold">
                      Environment Data ({environment})
                    </h4>
                    {Object.keys(availableData).length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        No data configured for this environment.
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(availableData).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center space-x-2 border p-2 rounded hover:bg-muted/50"
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
                          <div className="hidden print:block print:text-xs">
                            [{selectedKeys.has(key) ? "x" : " "}] {key}: {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom Data Section */}
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs uppercase text-muted-foreground font-bold">
                        Custom Key-Value Pairs
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
                          placeholder="Key"
                          value={row.key}
                          onChange={(e) =>
                            updateCustomRow(idx, "key", e.target.value)
                          }
                          className="h-8 text-xs font-mono"
                        />
                        <Input
                          placeholder="Value"
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
                        No custom keys added.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Test Description & Evidence</Label>
                <TiptapEditor
                  content={descriptionHtml}
                  onChange={setDescriptionHtml}
                  placeholder="Describe the test steps, expected results, and paste any evidence..."
                />
              </div>

              <div className="flex justify-end gap-2 print:hidden">
                <Button
                  type="submit"
                  disabled={isSubmitting || !environment || !name}
                >
                  {isSubmitting ? "Saving..." : "Save Record"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
