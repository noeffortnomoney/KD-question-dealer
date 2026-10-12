SET NOCOUNT ON;

SELECT exam_id, dealer_id, COUNT(*) AS cnt
FROM exam_attempts
WHERE status <> N'Voided'
GROUP BY exam_id, dealer_id
HAVING COUNT(*) > 1;

SELECT attempt_id, attempt_question_id, COUNT(*) AS cnt
FROM attempt_answers
GROUP BY attempt_id, attempt_question_id
HAVING COUNT(*) > 1;

SELECT id
FROM exam_attempts
WHERE status = N'InProgress' AND deadline_at < DATEADD(MINUTE, -2, SYSUTCDATETIME());

SELECT a.id, a.correct_count, x.recomputed
FROM exam_attempts a
CROSS APPLY (
    SELECT SUM(CASE WHEN ans.selected_option_id = TRY_CAST(JSON_VALUE(q.snapshot, '$.correctOptionId') AS UNIQUEIDENTIFIER) THEN q.points ELSE 0 END) AS recomputed
    FROM attempt_questions q
    LEFT JOIN attempt_answers ans ON ans.attempt_question_id = q.id
    WHERE q.attempt_id = a.id
) x
WHERE a.status IN (N'Submitted', N'Expired') AND a.correct_count <> x.recomputed;

