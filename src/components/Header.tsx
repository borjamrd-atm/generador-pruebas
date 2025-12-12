"use client";

import { ModeToggle } from "@/components/mode-toggle";

import { Button } from "@/components/ui/button";
import { ImportConflictModal } from "@/components/ImportConflictModal";
import { detectConflicts, mergeData } from "@/lib/import-utils"; // Import utility functions
import { db } from "@/lib/db";
import { Download, FileText, Image as ImageIcon, Upload } from "lucide-react";
import { useRef, useState } from "react";

export default function Header() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importState, setImportState] = useState<{
    pendingFile: File | null;
    currentData: any; // Using exact types would be better but for brevity in state
    incomingData: any;
    importResult: any;
  } | null>(null);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImporting(true);
      try {
        const text = await file.text();
        const incomingData = JSON.parse(text);

        if (!incomingData || !Array.isArray(incomingData.projects)) {
          alert("Invalid file format. 'projects' array missing.");
          setIsImporting(false);
          return;
        }

        const currentProjects = await db.projects.toArray();
        const result = detectConflicts(currentProjects, incomingData.projects);

        setImportState({
          pendingFile: file,
          currentData: { projects: currentProjects },
          incomingData: incomingData,
          importResult: result,
        });
      } catch (error) {
        console.error("Error reading file", error);
        alert("Error reading file or invalid JSON.");
      } finally {
        setIsImporting(false);
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOverwrite = async () => {
    if (!importState) return;

    setIsImporting(true);
    try {
      await db.transaction("rw", db.projects, async () => {
        await db.projects.clear();
        await db.projects.bulkAdd(importState.incomingData.projects);
      });
      alert("Base de datos importada (Sobreescrita) correctamente!");
      window.location.reload(); // Force refresh to show new data
    } catch (error) {
      console.error("Overwrite failed", error);
      alert("Error during overwrite.");
    } finally {
      setIsImporting(false);
      setImportState(null);
    }
  };

  const handleMerge = async () => {
    if (!importState) return;

    setIsImporting(true);
    try {
      const mergedProjects = mergeData(
        importState.currentData.projects,
        importState.incomingData.projects
      );

      await db.transaction("rw", db.projects, async () => {
        await db.projects.clear();
        await db.projects.bulkAdd(mergedProjects);
      });
      alert("Base de datos actualizada (Fusionada) correctamente!");
      window.location.reload();
    } catch (error) {
      console.error("Merge failed", error);
      alert("Error during merge.");
    } finally {
      setIsImporting(false);
      setImportState(null);
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
            {isImporting ? "Procesando..." : "Importar DB"}
          </Button>
        </div>

        {importState && (
          <ImportConflictModal
            isOpen={!!importState}
            onOpenChange={(open) => !open && setImportState(null)}
            importResult={importState.importResult}
            onOverwrite={handleOverwrite}
            onMerge={handleMerge}
          />
        )}
      </div>
    </header>
  );
}
