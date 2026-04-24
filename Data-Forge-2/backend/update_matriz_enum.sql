-- Script para adicionar 'Matriz' ao ENUM de acesso no Supabase
-- Execute este script no SQL Editor do Supabase

-- Verifica se o tipo acesso_enum existe e adiciona o valor 'Matriz'
DO $$
BEGIN
    -- Tenta adicionar 'Matriz' ao ENUM se ele existir
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'acesso_enum') THEN
        ALTER TYPE acesso_enum ADD VALUE IF NOT EXISTS 'Matriz';
        RAISE NOTICE 'Valor Matriz adicionado ao ENUM acesso_enum';
    ELSE
        RAISE NOTICE 'Tipo acesso_enum nao existe - campo acesso deve ser TEXT/VARCHAR';
    END IF;
END $$;

-- Verifica o resultado
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'usuarios' AND column_name = 'acesso';
