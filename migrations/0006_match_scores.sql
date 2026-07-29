ALTER TABLE matches ADD COLUMN kuriyama_score INTEGER CHECK(kuriyama_score IS NULL OR kuriyama_score >= 0);
ALTER TABLE matches ADD COLUMN opponent_score INTEGER CHECK(opponent_score IS NULL OR opponent_score >= 0);
