import { notFound } from "next/navigation";
import { dbToApp } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import { Navigation } from "@/components/navigation";
import { DuaForm } from "@/components/dua-form";

interface EditDuaPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDuaPage({ params }: EditDuaPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("duas")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  // Fetch tags for this dua
  const { data: duaTags } = await supabase
    .from("dua_tags")
    .select("tag_id, tags(*)")
    .eq("dua_id", id);

  const tagIds = duaTags?.map((dt) => dt.tag_id) || [];

  const dua = dbToApp(data);

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="pt-20 pb-28 md:pb-8 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Edit Dua</h1>
            <p className="text-muted-foreground">
              Update the details of your dua
            </p>
          </div>

          {/* Form */}
          <DuaForm
            mode="edit"
            duaId={dua.id}
            initialData={{
              title: dua.title,
              arabicText: dua.arabicText,
              translation: dua.translation,
              transliteration: dua.transliteration || "",
              description: dua.description || "",
              source: dua.source || "",
            }}
            initialTagIds={tagIds}
          />
        </div>
      </main>
    </div>
  );
}
