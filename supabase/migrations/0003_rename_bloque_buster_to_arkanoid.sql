update public.games
set id = 'arkanoid', title = 'ARKANOID', cover = 'cover-arkanoid'
where id = 'bloque-buster';

update public.scores
set game_id = 'arkanoid'
where game_id = 'bloque-buster';
