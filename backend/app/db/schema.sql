create table if not exists wallet_links (
    wallet_address text primary key,
    telegram_chat_id bigint not null,
    created_at timestamptz not null default now()
);

create table if not exists trades (
    trade_id bigint primary key,
    wallet_address text not null,
    bot_id smallint not null,
    bot_name text not null,
    symbol text not null,
    side text not null,
    status text not null,
    entry_price numeric not null,
    exit_price numeric,
    collateral numeric not null,
    pnl numeric,
    opened_at timestamptz not null default now(),
    closed_at timestamptz
);

create index if not exists trades_wallet_idx on trades (wallet_address);
create index if not exists trades_bot_idx on trades (bot_id);
