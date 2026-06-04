import { SearchDirectory } from "@/components/SearchDirectory";

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ oficio?: string; municipio?: string }>;
}) {
  const params = await searchParams;

  return <SearchDirectory initialCategory={params.oficio || ""} initialMunicipality={params.municipio || ""} />;
}
