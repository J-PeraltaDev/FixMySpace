import { z } from "zod";
import { municipalities, serviceCategories } from "@/lib/catalog";

export const serviceRequestSchema = z.object({
  title: z.string().trim().min(5, "El título debe tener al menos 5 caracteres."),
  description: z.string().trim().min(20, "La descripción debe tener al menos 20 caracteres."),
  category: z.string()
    .min(1, "Selecciona una categoría.")
    .refine((value) => !value || serviceCategories.includes(value), "Selecciona una categoría válida."),
  municipality: z.string()
    .min(1, "Selecciona un municipio.")
    .refine((value) => !value || municipalities.includes(value), "Selecciona un municipio válido."),
  address: z.string().trim().min(5, "La dirección debe tener al menos 5 caracteres."),
  preferredDate: z.string().min(1, "Selecciona una fecha."),
  preferredTime: z.string().min(1, "Selecciona una hora."),
  price: z.coerce.number().optional(),
});

export type ServiceRequestFormValues = z.infer<typeof serviceRequestSchema>;
