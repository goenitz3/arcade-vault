update public.games
set id = 'tetris', title = 'TETRIS', cover = 'cover-tetris'
where id = 'caida';

update public.scores
set game_id = 'tetris'
where game_id = 'caida';
