"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import TiptapEditor from "@/components/TiptapEditor";
import { createTest, getProject, Project } from "@/lib/storage";

export default function NewTestForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [functional, setFunctional] = useState("");
  const [relatedTask, setRelatedTask] = useState("");

  useEffect(() => {
    getProject(projectId).then((p) => {
      setProject(p || null);
      setLoading(false);
    });
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !environment || !name) return;

    setIsSubmitting(true);
    // Get data for selected env
    const envData = project.data[environment] || {};

    await createTest(
      projectId,
      name,
      environment,
      envData,
      functional,
      relatedTask,
      descriptionHtml
    );
    setIsSubmitting(false);
    router.push(`/projects/${projectId}`);
    router.refresh();
  };

  if (loading)
    return <div className="p-10 text-center">Loading project data...</div>;
  if (!project)
    return <div className="p-10 text-center">Project not found</div>;

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Record New Test</CardTitle>
          <CardDescription>
            Document a new test execution for {project.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="testName">Test Name</Label>
              <div className="relative">
                <input
                  id="testName"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g. User Login Validation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Environment</Label>
              <Select
                onValueChange={setEnvironment}
                value={environment}
                required
              >
                <SelectTrigger>
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
            </div>

            {environment && (
              <div className="p-4 bg-muted/20 rounded-md border text-sm">
                <Label className="mb-2 block text-muted-foreground uppercase text-xs font-bold">
                  Data Snapshot for {environment}
                </Label>
                <pre className="font-mono text-xs overflow-auto max-h-40">
                  {JSON.stringify(project.data[environment] || {}, null, 2)}
                </pre>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  This data will be attached to the test record.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Test Description & Evidence</Label>
              <TiptapEditor
                content={descriptionHtml}
                onChange={setDescriptionHtml}
                placeholder="Describe the test steps, expected results, and paste any evidence (basic text)..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !environment || !name}
              >
                {isSubmitting ? "Saving..." : "Save Test Record"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
