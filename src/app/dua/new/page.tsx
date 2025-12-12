import { Navigation } from "@/components/navigation";
import { DuaForm } from "@/components/dua-form";

export default function NewDuaPage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="pt-20 pb-28 md:pb-8 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Add New Dua</h1>
            <p className="text-muted-foreground">
              Add a new dua to your collection
            </p>
          </div>

          {/* Form */}
          <DuaForm mode="create" />
        </div>
      </main>
    </div>
  );
}
