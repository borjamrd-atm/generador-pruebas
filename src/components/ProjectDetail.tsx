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
import { Trash2 } from "lucide-react";

export default function ProjectDetail({ id }: { id: string }) {
  const project = useLiveQuery(() => db.projects.get(id));

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
            <Button asChild className="bg-primary hover:bg-primary/80">
              <Link href={`/projects/${id}/new-test`}>+ Nueva prueba</Link>
            </Button>
          </div>

          <div className="grid gap-4">
            {project.tests?.length === 0 && (
              <Card className="bg-muted/5 border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-10 text-muted-foreground">
                  <p>No hay pruebas creadas.</p>
                  <p>Click "Nueva prueba" para crear una.</p>
                </CardContent>
              </Card>
            )}
            {project.tests?.map((test) => (
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
    </div>
  );
}
