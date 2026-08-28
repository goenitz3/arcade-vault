update public.games
set id = 'snake', title = 'SNAKE', cover = 'cover-snake'
where id = 'serpentina';

update public.scores
set game_id = 'snake'
where game_id = 'serpentina';
