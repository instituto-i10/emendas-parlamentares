-- Marca se o programa consta do PPA vigente.
-- Base da checagem PROGRAMA_NO_PPA (LOM art. 140 §1º, I). Antes ela derivava de
-- dotações ligadas ao instrumento PPA — e PPA não tem dotação, então o conjunto
-- vinha sempre vazio.
ALTER TABLE "Programa" ADD COLUMN "constaNoPPA" BOOLEAN NOT NULL DEFAULT false;
