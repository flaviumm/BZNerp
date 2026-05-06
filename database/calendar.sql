alter table tasks
add column if not exists event_type text not null default 'Tarea',
add column if not exists start_time time,
add column if not exists end_time time,
add column if not exists notes text not null default '';
