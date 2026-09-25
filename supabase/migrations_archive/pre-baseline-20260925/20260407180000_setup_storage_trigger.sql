-- SQL para configurar o Trigger de Storage para processamento de imagens
-- Este script associa o bucket 'property-images' à Edge Function 'process-image-variants'

-- 1. Garantir que a extensão net está disponível para chamadas HTTP
-- CREATE EXTENSION IF NOT EXISTS "net" WITH SCHEMA "extensions";

-- 2. Criar a função que chama a Edge Function
CREATE OR REPLACE FUNCTION public.handle_storage_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT := 'https://brjumbfpvijrkhrherpt.supabase.co'; -- Substituir pelo teu URL se for diferente
  edge_function_url TEXT := project_url || '/functions/v1/process-image-variants';
  service_role_key TEXT := 'REPLACE_WITH_YOUR_SERVICE_ROLE_KEY'; -- Recomendado usar Vault ou variável de ambiente se possível
BEGIN
  -- Só processa se for no bucket correto
  IF NEW.bucket_id = 'property-images' THEN
    PERFORM
      extensions.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'Records', jsonb_build_array(
            jsonb_build_object(
              's3', jsonb_build_object(
                'bucket', jsonb_build_object('name', NEW.bucket_id),
                'object', jsonb_build_object('key', NEW.name)
              ),
              'eventName', 'INSERT'
            )
          )
        )
      );
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Criar o Trigger na tabela de objetos do storage
DROP TRIGGER IF EXISTS on_image_upload ON storage.objects;
CREATE TRIGGER on_image_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_storage_upload();

COMMENT ON FUNCTION public.handle_storage_upload IS 'Trigger para processar variantes de imagem via Edge Function após upload no Storage.';
