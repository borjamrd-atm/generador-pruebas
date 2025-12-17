"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import TestCard from "@/components/TestCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Trash2, Download, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { createRoot } from "react-dom/client";
import { TestPrintTemplate } from "@/components/TestPrintTemplate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

export default function ProjectDetail({ id }: { id: string }) {
  const project = useLiveQuery(() => db.projects.get(id));
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter & Sort State
  const [filterName, setFilterName] = useState("");
  const [filterLayer, setFilterLayer] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterEnv, setFilterEnv] = useState("all");
  const [sortField, setSortField] = useState<
    "date" | "relatedTask" | "taskNumber"
  >("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Derive unique values for filters
  const uniqueLayers = Array.from(
    new Set(project?.tests?.map((t) => t.layer).filter((t): t is string => !!t))
  ).sort();
  const uniqueTypes = Array.from(
    new Set(
      project?.tests?.map((t) => t.taskType).filter((t): t is string => !!t)
    )
  ).sort();
  const uniqueEnvs = Array.from(
    new Set(
      project?.tests?.map((t) => t.environment).filter((t): t is string => !!t)
    )
  ).sort();

  // Filter & Sort Logic
  const filteredAndSortedTests = project?.tests
    ?.filter((test) => {
      const matchName = test.name
        .toLowerCase()
        .includes(filterName.toLowerCase());
      const matchLayer = filterLayer === "all" || test.layer === filterLayer;
      const matchType = filterType === "all" || test.taskType === filterType;
      const matchEnv = filterEnv === "all" || test.environment === filterEnv;

      return matchName && matchLayer && matchType && matchEnv;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "date": {
          const dateA = new Date(a.date || a.createdAt).getTime();
          const dateB = new Date(b.date || b.createdAt).getTime();
          comparison = dateA - dateB;
          break;
        }
        case "relatedTask": {
          // Get first related task or fallback
          const taskA = a.relatedTasks?.[0] || a.relatedTask || "";
          const taskB = b.relatedTasks?.[0] || b.relatedTask || "";
          comparison = taskA.localeCompare(taskB);
          break;
        }
        case "taskNumber": {
          // Extract number from end of URL if possible
          const getTaskNum = (t: typeof a) => {
            const taskUrl = t.relatedTasks?.[0] || t.relatedTask || "";
            const match = taskUrl.match(/\/(\d+)$/) || taskUrl.match(/(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          };
          comparison = getTaskNum(a) - getTaskNum(b);
          break;
        }
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

  // Loading state
  // If project is undefined, it might be loading or not found.
  // useLiveQuery returns undefined while loading.
  // We can't distinguish loading from not found easily without a wrapper or check.
  // However, Dexie get returns undefined if not found.
  // So we might flicker not found. Use a state or assume loading if initially undefined?
  // Ideally we wait a bit or handle it. For now, simple check.
  // If useLiveQuery is undefined, we return null (loading).
  // If we want to handle 404, we need to know if the query finished.
  // Let's assume if it's undefined it's loading or not found.
  // For better UX we could check count?
  // Let's just return a skeleton or null.

  if (!project && project !== undefined) {
    // If explicitly null or we handled loading... actually useLiveQuery returns undefined initially.
    // We'll just render nothing while loading.
    return <div>Loading...</div>;
  }

  // To handle "Not Found" correctly after loading is tricky with just useLiveQuery hook shorthand.
  // But usually it's fast.
  if (project === undefined) return <div>Loading...</div>;
  if (!project) return <div>Project not found</div>;

  const handleAddEnvironment = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const envName = formData.get("envName") as string;
    if (envName && !project.environments.includes(envName)) {
      try {
        const updatedData = { ...project.data };
        if (!updatedData[envName]) {
          updatedData[envName] = {};
        }

        await db.projects.update(id, {
          environments: [...project.environments, envName],
          data: updatedData,
        });
        (e.target as HTMLFormElement).reset();
      } catch (error) {
        console.error("Failed to add environment", error);
      }
    }
  };

  const handleSaveData = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const envName = formData.get("envName") as string;
    const key = formData.get("key") as string;
    const value = formData.get("value") as string;

    if (envName && key) {
      try {
        const currentData = project.data[envName] || {};
        const newData = { ...currentData, [key]: value };

        const updatedProjectData = { ...project.data };
        updatedProjectData[envName] = newData;

        await db.projects.update(id, {
          data: updatedProjectData,
        });
        (e.target as HTMLFormElement).reset();
      } catch (error) {
        console.error("Failed to save data", error);
      }
    }
  };

  const handleDeleteData = async (envName: string, key: string) => {
    if (!project) return;
    try {
      const currentData = { ...project.data };
      const envData = { ...currentData[envName] };

      delete envData[key];
      currentData[envName] = envData;

      await db.projects.update(id, {
        data: currentData,
      });
    } catch (error) {
      console.error("Failed to delete data key", error);
    }
  };

  const handleBulkDownload = async () => {
    if (!project?.tests || project.tests.length === 0) return;
    setIsGenerating(true);

    try {
      const settings = await db.settings.get("global");
      const logo = settings?.logo;
      const zip = new JSZip();

      // Create a temporary container for rendering
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = "210mm"; // A4 width usually approx 210mm
      container.style.background = "white"; // Ensure white background
      document.body.appendChild(container);

      for (const test of project.tests) {
        // Create a wrapper for this specific test
        const testWrapper = document.createElement("div");
        container.appendChild(testWrapper);

        await new Promise<void>((resolve) => {
          const root = createRoot(testWrapper);
          root.render(
            <TestPrintTemplate
              test={test}
              projectName={project.name}
              logo={logo}
            />
          );

          // Wait for render and potential image loads
          setTimeout(() => {
            resolve();
          }, 500);
        });

        try {
          const canvas = await html2canvas(testWrapper, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
          });

          const imgData = canvas.toDataURL("image/png");

          // A4 dimensions in mm
          const pdf = new jsPDF("p", "mm", "a4");
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

          // Sanitize filename
          const filename = `${test.name.replace(/[^a-z0-9]/gi, "_")}.pdf`;
          zip.file(filename, pdf.output("blob"));
        } catch (err) {
          console.error(`Error generating PDF for test ${test.name}:`, err);
        }

        // Clean up the wrapper content for next iteration (though we append new wrapper)
        // Actually, better to remove the wrapper to keep DOM light
        testWrapper.remove();
      }

      document.body.removeChild(container);

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(
        content,
        `${project.name.replace(/[^a-z0-9]/gi, "_")}-pruebas.zip`
      );
    } catch (error) {
      console.error("Error in bulk download:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-6">
        <Link
          href="/"
          className="text-muted-foreground hover:text-white mb-2 inline-block"
        >
          &larr; Volver a Proyectos
        </Link>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
          {project.name}
        </h1>
        <p className="text-muted-foreground">
          Gestiona los entornos, la configuración de datos y las listas de
          pruebas.
        </p>
      </div>

      <Tabs defaultValue="tests" className="w-full space-y-6">
        <TabsList className="bg-muted/20 p-1 border border-white/10">
          <TabsTrigger value="tests">Lista de pruebas</TabsTrigger>
          <TabsTrigger value="environments">Entornos</TabsTrigger>
          <TabsTrigger value="data">Configuración de datos</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Lista de pruebas</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleBulkDownload}
                disabled={isGenerating || !project.tests?.length}
                title="Descargar en bloque"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button asChild className="bg-primary hover:bg-primary/80">
                <Link href={`/projects/${id}/new-test`}>+ Nueva prueba</Link>
              </Button>
            </div>
          </div>

          {/* Filters & Sort Controls */}
          <Card className="bg-muted/10 border-none shadow-none">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search Name */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Nombre de prueba
                  </Label>
                  <Input
                    placeholder="Buscar..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="h-9 bg-background"
                  />
                </div>

                {/* Filter Layer */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Capa</Label>
                  <Select value={filterLayer} onValueChange={setFilterLayer}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {uniqueLayers.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter Type */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Tipo de prueba
                  </Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {uniqueTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter Environment */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Entorno
                  </Label>
                  <Select value={filterEnv} onValueChange={setFilterEnv}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {uniqueEnvs.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Controls */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Ordenar por
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={sortField}
                      onValueChange={(v: any) => setSortField(v)}
                    >
                      <SelectTrigger className="h-9 bg-background flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Fecha</SelectItem>
                        <SelectItem value="taskNumber">
                          Numero de tarea
                        </SelectItem>
                        <SelectItem value="relatedTask">
                          Tarea relacionada
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 bg-background"
                      onClick={() =>
                        setSortDirection((prev) =>
                          prev === "asc" ? "desc" : "asc"
                        )
                      }
                      title={
                        sortDirection === "asc" ? "Ascendente" : "Descendente"
                      }
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {filteredAndSortedTests?.length === 0 && (
              <Card className="bg-muted/5 border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-10 text-muted-foreground">
                  <p>No se encontraron pruebas.</p>
                  {project.tests?.length === 0 && (
                    <p>Click "Nueva prueba" para crear una.</p>
                  )}
                </CardContent>
              </Card>
            )}
            {filteredAndSortedTests?.map((test) => (
              <TestCard key={test.id} test={test} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="environments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Entornos</CardTitle>
              <CardDescription>
                Define entornos donde se ejecutan las pruebas (e.g. Dev, QA,
                UAT).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-6">
                {project.environments.map((env) => (
                  <div
                    key={env}
                    className="px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30"
                  >
                    {env}
                  </div>
                ))}
                {project.environments.length === 0 && (
                  <span className="text-muted-foreground italic">
                    No entornos definidos
                  </span>
                )}
              </div>

              <form
                onSubmit={handleAddEnvironment}
                className="flex gap-4 items-end max-w-sm"
              >
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="envName">Nuevo entorno</Label>
                  <Input
                    type="text"
                    id="envName"
                    name="envName"
                    placeholder="e.g. Staging"
                    required
                  />
                </div>
                <Button type="submit" variant="secondary">
                  Añadir
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de datos</CardTitle>
              <CardDescription>
                Configura datos para cada entorno
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {project.environments.length === 0 ? (
                <div className="text-destructive">
                  Please add environments first.
                </div>
              ) : (
                project.environments.map((env) => (
                  <div key={env} className="border p-4 rounded-lg bg-muted/10">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>{" "}
                      {env}
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* List existing keys */}
                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-muted-foreground font-semibold">
                          Datos actuales
                        </Label>
                        {Object.entries(project.data[env] || {}).map(
                          ([k, v]) => (
                            <div
                              key={k}
                              className="flex justify-between items-center text-sm border-b border-border/50 pb-1"
                            >
                              <span className="font-mono text-muted-foreground">
                                {k}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{v}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteData(env, k)}
                                  title="Eliminar este dato"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )
                        )}
                        {Object.keys(project.data[env] || {}).length === 0 && (
                          <p className="text-sm text-muted-foreground italic">
                            No datos configurados.
                          </p>
                        )}
                      </div>

                      {/* Add new key form */}
                      <div className="space-y-2 border-l pl-4 border-border/50">
                        <Label className="text-xs uppercase text-muted-foreground font-semibold">
                          Añadir / Actualizar clave
                        </Label>
                        <form onSubmit={handleSaveData} className="space-y-3">
                          <input type="hidden" name="envName" value={env} />
                          <Input
                            name="key"
                            placeholder="Key (e.g. ContractID)"
                            required
                            className="h-8 text-sm"
                          />
                          <Input
                            name="value"
                            placeholder="Value (e.g. 12345)"
                            required
                            className="h-8 text-sm"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="w-full"
                          >
                            Guardar clave
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-background border p-8 rounded-xl shadow-2xl flex flex-col items-center gap-4 min-w-[300px]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="font-bold text-lg">Generando PDFS...</h3>
              <p className="text-sm text-muted-foreground">
                Por favor espere, esto puede tardar unos segundos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
