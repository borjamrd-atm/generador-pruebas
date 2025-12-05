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
import { addEnvironment, getProject, saveDataset } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";

// Next.js 15 params type
type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  async function handleAddEnvironment(formData: FormData) {
    "use server";
    const envName = formData.get("envName") as string;
    if (envName) {
      await addEnvironment(id, envName);
      revalidatePath(`/projects/${id}`);
    }
  }

  async function handleSaveData(formData: FormData) {
    "use server";
    const envName = formData.get("envName") as string;
    const key = formData.get("key") as string;
    const value = formData.get("value") as string;

    // Simplification: In a real app we might want bulk edit.
    // Here we will merge with existing data for this env.
    const currentData = project?.data[envName] || {};
    const newData = { ...currentData, [key]: value };

    await saveDataset(id, envName, newData);
    revalidatePath(`/projects/${id}`);
  }

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
                action={handleAddEnvironment}
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
                              <span className="font-medium">{v}</span>
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
                        <form action={handleSaveData} className="space-y-3">
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
