import ProjectList from "@/components/ProjectList";

export default function Home() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Documentación de pruebas
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus proyectos y genera evidencia de pruebas con facilidad.
          </p>
        </div>
      </div>

      <ProjectList />
    </div>
  );
}
