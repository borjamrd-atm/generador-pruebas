"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Project, TestRecord } from "@/lib/db";
import { cn } from "@/lib/utils"; // Assuming utils exists, usually does in shadcn
import { AlertTriangle, ArrowRight, FileJson, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { compareProject, ImportResult, ProjectDiff } from "@/lib/import-utils";

interface ImportConflictModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  importResult: ImportResult;
  onOverwrite: () => void;
  onMerge: () => void;
}

export function ImportConflictModal({
  isOpen,
  onOpenChange,
  importResult,
  onOverwrite,
  onMerge,
}: ImportConflictModalProps) {
  const { newProjects, conflictingProjects, identicalProjects } = importResult;
  const [showDiff, setShowDiff] = useState(false);

  // If there are conflicts, calculate diffs
  const conflictsDiffs = conflictingProjects.map((c) =>
    compareProject(c.current, c.incoming)
  );

  const hasConflicts = conflictingProjects.length > 0;

  const handleMergeClick = () => {
    if (hasConflicts && !showDiff) {
      setShowDiff(true);
    } else {
      onMerge();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ImportIcon className="h-5 w-5" />
            Configuración de Importación
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se ha detectado contenido en el archivo importado. Elige cómo
            proceder.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              title="Nuevos Proyectos"
              count={newProjects.length}
              variant="default"
            />
            <SummaryCard
              title="Conflictos (IDs repetidos)"
              count={conflictingProjects.length}
              variant={hasConflicts ? "destructive" : "default"}
            />
            <SummaryCard
              title="Sin Cambios"
              count={identicalProjects.length}
              variant="outline"
            />
          </div>

          {showDiff && hasConflicts && (
            <div className="border rounded-md p-4 bg-muted/30">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Diferencias encontradas
              </h3>
              <div className="space-y-4">
                {conflictsDiffs.map((diff) => (
                  <ProjectDiffView key={diff.projectId} diff={diff} />
                ))}
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancelar
          </AlertDialogCancel>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="destructive" onClick={onOverwrite}>
              Sobreescribir Todo
            </Button>
            <Button onClick={handleMergeClick}>
              {showDiff ? "Confirmar Fusión" : "Mantener Actual (Fusionar)"}
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SummaryCard({
  title,
  count,
  variant = "default",
}: {
  title: string;
  count: number;
  variant?: "default" | "destructive" | "outline";
}) {
  const bgClass =
    variant === "destructive"
      ? "bg-destructive/10 border-destructive/20 text-destructive"
      : variant === "outline"
      ? "bg-muted text-muted-foreground"
      : "bg-primary/10 border-primary/20 text-primary";

  return (
    <div className={cn("border rounded-lg p-3 text-center", bgClass)}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs uppercase font-semibold">{title}</div>
    </div>
  );
}

function ProjectDiffView({ diff }: { diff: ProjectDiff }) {
  return (
    <div className="bg-background border rounded p-3 text-sm">
      <div className="font-medium mb-2 border-b pb-1">{diff.projectName}</div>

      {/* Field Changes */}
      {diff.fields.length > 0 && (
        <div className="mb-3 space-y-1">
          {diff.fields.map((field) => (
            <div
              key={field.key}
              className="grid grid-cols-[100px_1fr_1fr] gap-2 items-center"
            >
              <span className="text-muted-foreground">{field.key}:</span>
              <span className="text-red-500 font-mono text-xs truncate bg-red-50 dark:bg-red-900/10 p-1 rounded">
                {JSON.stringify(field.current)}
              </span>
              <span className="text-green-500 font-mono text-xs truncate bg-green-50 dark:bg-green-900/10 p-1 rounded">
                {JSON.stringify(field.incoming)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Test Changes */}
      {diff.tests.modified.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            Pruebas Modificadas:
          </p>
          {diff.tests.modified.map((mod) => (
            <div
              key={mod.current.id}
              className="ml-2 border-l-2 pl-2 border-muted-foreground/20"
            >
              <p className="text-xs font-medium mb-1">{mod.current.name}</p>
              {/* Compare fields of test simply or list them? */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-red-50 dark:bg-red-900/10 p-1 rounded">
                  <h5 className="font-bold text-[10px] text-red-600 mb-1">
                    LOCAL
                  </h5>
                  <pre className="whitespace-pre-wrap overflow-x-auto max-h-20 opacity-80">
                    {mod.current.description}
                  </pre>
                </div>
                <div className="bg-green-50 dark:bg-green-900/10 p-1 rounded">
                  <h5 className="font-bold text-[10px] text-green-600 mb-1">
                    IMPORTADO
                  </h5>
                  <pre className="whitespace-pre-wrap overflow-x-auto max-h-20 opacity-80">
                    {mod.incoming.description}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {diff.tests.added.length > 0 && (
        <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
          <Plus className="h-3 w-3" /> {diff.tests.added.length} pruebas nuevas
          serán añadidas
        </div>
      )}
    </div>
  );
}

function ImportIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4" />
    </svg>
  );
}
