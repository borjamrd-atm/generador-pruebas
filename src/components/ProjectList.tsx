"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, Project } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export default function ProjectList() {
  const projects = useLiveQuery(() => db.projects.toArray());
  const [newProjectName, setNewProjectName] = useState("");

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const newProject: Project = {
        id: uuidv4(),
        name: newProjectName,
        environments: [],
        data: {},
        tests: [],
        createdAt: new Date().toISOString(),
      };
      await db.projects.add(newProject);
      setNewProjectName("");
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  if (!projects) return null; // Loading state

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* New Project Card */}
      <Card className="border-dashed border-2 border-muted hover:border-primary/50 transition-colors flex flex-col justify-center p-6 space-y-4">
        <CardHeader>
          <CardTitle>Crear proyecto</CardTitle>
          <CardDescription>
            Comienza documentando una nueva aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="w-full">
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="sr-only">
                Nombre del proyecto
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Nombre del proyecto"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="bg-background"
              />
            </div>
            <Button type="submit" className="w-full">
              Crear proyecto
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Projects */}
      {projects.map((project) => (
        <Card
          key={project.id}
          className="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
        >
          <CardHeader>
            <CardTitle className="flex justify-between items-start">
              <span className="truncate">{project.name}</span>
            </CardTitle>
            <CardDescription>
              Creado el {new Date(project.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <div className="flex flex-col">
                <span className="font-bold text-foreground">
                  {project.environments.length}
                </span>
                <span>Entornos</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground">
                  {project.tests.length}
                </span>
                <span>Pruebas</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full variant-secondary">
              <Link href={`/projects/${project.id}`}>Ver detalles</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
