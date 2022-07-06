-- This file is automatically generated using maintenance/generateSchemaSql.php.
-- Source: sql/tables.json
-- Do not modify this file directly.
-- See https://www.mediawiki.org/wiki/Manual:Schema_changes
CREATE TABLE thread (
  thread_id SERIAL NOT NULL,
  thread_root INT NOT NULL,
  thread_ancestor INT NOT NULL,
  thread_parent INT DEFAULT NULL,
  thread_summary_page INT DEFAULT NULL,
  thread_subject VARCHAR(255) DEFAULT NULL,
  thread_author_id INT DEFAULT NULL,
  thread_author_name VARCHAR(255) DEFAULT NULL,
  thread_modified TIMESTAMPTZ NOT NULL,
  thread_created TIMESTAMPTZ NOT NULL,
  thread_editedness INT DEFAULT 0 NOT NULL,
  thread_article_namespace INT NOT NULL,
  thread_article_title TEXT NOT NULL,
  thread_article_id INT NOT NULL,
  thread_type INT DEFAULT 0 NOT NULL,
  thread_sortkey VARCHAR(255) DEFAULT '' NOT NULL,
  thread_replies INT DEFAULT -1,
  thread_signature TEXT DEFAULT NULL,
  PRIMARY KEY(thread_id)
);

CREATE UNIQUE INDEX thread_root ON thread (thread_root);

CREATE INDEX thread_ancestor ON thread (thread_ancestor, thread_parent);

CREATE INDEX thread_article_title ON thread (
  thread_article_namespace, thread_article_title,
  thread_sortkey
);

CREATE INDEX thread_article ON thread (
  thread_article_id, thread_sortkey
);

CREATE INDEX thread_modified ON thread (thread_modified);

CREATE INDEX thread_created ON thread (thread_created);

CREATE INDEX thread_summary_page ON thread (thread_summary_page);

CREATE INDEX thread_author_name ON thread (
  thread_author_id, thread_author_name
);

CREATE INDEX thread_sortkey ON thread (thread_sortkey);

CREATE INDEX thread_parent ON thread (thread_parent);


CREATE TABLE historical_thread (
  hthread_id INT NOT NULL,
  hthread_revision INT NOT NULL,
  hthread_contents TEXT NOT NULL,
  hthread_change_type INT NOT NULL,
  hthread_change_object INT DEFAULT NULL,
  PRIMARY KEY(hthread_id, hthread_revision)
);


CREATE TABLE user_message_state (
  ums_user INT NOT NULL,
  ums_thread INT NOT NULL,
  ums_conversation INT DEFAULT 0 NOT NULL,
  ums_read_timestamp TIMESTAMPTZ DEFAULT NULL,
  PRIMARY KEY(ums_user, ums_thread)
);

CREATE INDEX ums_user_conversation ON user_message_state (ums_user, ums_conversation);


CREATE TABLE thread_history (
  th_id SERIAL NOT NULL,
  th_thread INT NOT NULL,
  th_timestamp TIMESTAMPTZ NOT NULL,
  th_user INT NOT NULL,
  th_user_text VARCHAR(255) NOT NULL,
  th_change_type INT NOT NULL,
  th_change_object INT NOT NULL,
  th_change_comment TEXT NOT NULL,
  th_content TEXT NOT NULL,
  PRIMARY KEY(th_id)
);

CREATE INDEX th_thread_timestamp ON thread_history (th_thread, th_timestamp);

CREATE INDEX th_timestamp_thread ON thread_history (th_timestamp, th_thread);

CREATE INDEX th_user_text ON thread_history (th_user, th_user_text);


CREATE TABLE thread_pending_relationship (
  tpr_thread INT NOT NULL,
  tpr_relationship TEXT NOT NULL,
  tpr_title TEXT NOT NULL,
  tpr_type TEXT NOT NULL,
  PRIMARY KEY(tpr_thread, tpr_relationship)
);


CREATE TABLE thread_reaction (
  tr_thread INT NOT NULL,
  tr_user INT NOT NULL,
  tr_user_text TEXT NOT NULL,
  tr_type TEXT NOT NULL,
  tr_value INT NOT NULL,
  PRIMARY KEY(
    tr_thread, tr_user, tr_user_text,
  tr_type, tr_value
  )
);

CREATE INDEX tr_user_text_value ON thread_reaction (
  tr_user, tr_user_text, tr_type, tr_value
);
