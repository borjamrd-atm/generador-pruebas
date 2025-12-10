"use client";

import { ModeToggle } from "@/components/mode-toggle";

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
import { db } from "@/lib/db";
import {
  AlertTriangle,
  Download,
  FileText,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";

export default function Header() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDownloadTemplate = () => {
    const template = {
      projects: [
        {
          id: "template-project-id",
          name: "Nombre del Proyecto",
          environments: ["Entorno 1", "Entorno 2"],
          data: {
            "Entorno 1": { clave: "valor" },
            "Entorno 2": { clave: "valor" },
          },
          tests: [],
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const jsonStr = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_db.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      const projects = await db.projects.toArray();
      const exportData = { projects };
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `db_export_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export database.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setShowConfirm(true);
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const confirmImport = async () => {
    if (!pendingFile) return;

    setIsImporting(true);
    try {
      const text = await pendingFile.text();
      const data = JSON.parse(text);
      if (data && Array.isArray(data.projects)) {
        // Transaction to clear and add
        await db.transaction("rw", db.projects, async () => {
          await db.projects.clear();
          await db.projects.bulkAdd(data.projects);
        });

        alert("Database imported successfully!");
        // router.refresh(); // Not strictly needed with liveQuery
      } else {
        alert(
          "Failed to import database. Invalid format (missing projects array)."
        );
      }
    } catch (error) {
      console.error("Import error", error);
      alert("Error reading file or invalid JSON.");
    } finally {
      setIsImporting(false);
      setPendingFile(null);
      setShowConfirm(false);
    }
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await db.settings.put({ id: "global", logo: base64 });
        alert("Logo actualizado correctamente");
      };
      reader.readAsDataURL(file);
    }
    // Reset
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto py-3 px-4 flex justify-end items-center gap-2">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={logoInputRef}
          onChange={handleLogoSelect}
        />
        <ModeToggle />
        <Button
          variant="outline"
          size="sm"
          onClick={() => logoInputRef.current?.click()}
          className="gap-2"
        >
          <ImageIcon className="h-4 w-4" />
          Logo
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadTemplate}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Plantilla
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar DB
        </Button>

        <div className="relative">
          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? "Importando..." : "Importar DB"}
          </Button>
        </div>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                ¡Advertencia!
              </AlertDialogTitle>
              <AlertDialogDescription>
                Estás a punto de importar una nueva base de datos. Esta acción
                <strong> SOBREESCRIBIRÁ</strong> todos los proyectos, entornos y
                pruebas existentes.
                <br />
                <br />
                Esta acción no se puede deshacer. ¿Deseas continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingFile(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmImport}
                className="bg-destructive hover:bg-destructive/90"
              >
                Sí, Importar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  );
}
