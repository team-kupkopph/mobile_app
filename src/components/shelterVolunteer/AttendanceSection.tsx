// Task 9 · the Attendance tab of the activity timeline — every roster row, once the shift has
// ended. Owns its own GET /shelter/shifts/{id}/roster fetch (independent of ConfirmedSection's
// — US-R2, a failed load gets its own retry).
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../../api/useApi";
import { LoadStateView } from "../LoadStateView";
import { loadState } from "../../net";
import { ConfirmModal } from "../ConfirmModal";
import { RosterRow, attendanceSuggestion } from "../../shelterVolunteer";
import { colors, radii, typography } from "../../theme";
import { Avatar, Button, Card, Chip, ChipTone } from "../ui";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function checkTimes(row: RosterRow): string {
  if (!row.check_in_at) return "Didn't check in";
  const inTime = new Date(row.check_in_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!row.check_out_at) return `In ${inTime}`;
  const outTime = new Date(row.check_out_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `In ${inTime} · Out ${outTime}`;
}

const OUTCOME_CHIP: Record<"completed" | "no_show", { label: string; tone: ChipTone }> = {
  completed: { label: "Attended", tone: "success" },
  no_show: { label: "No-show", tone: "danger" }
};

type Props = {
  shiftId: string;
};

export function AttendanceSection({ shiftId }: Props) {
  const api = useApi();
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [banner, setBanner] = useState<string | null>(null);
  const [busySignupId, setBusySignupId] = useState<string | null>(null);
  const [noShowSignupId, setNoShowSignupId] = useState<string | null>(null);

  const loadRoster = useCallback(() => {
    setRes(null);
    api.get(`/shelter/shifts/${shiftId}/roster`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setRoster(r.data?.results ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [shiftId]);

  useFocusEffect(useCallback(() => { loadRoster(); }, [loadRoster]));

  async function markAttendance(signupId: string, outcome: "completed" | "no_show") {
    if (busySignupId) return; // one row at a time; the buttons show `loading` for that row
    setBusySignupId(signupId);
    setBanner(null);
    const res = await api.post(`/shelter/signups/${signupId}/attendance`, { outcome });
    setBusySignupId(null);
    if (res.ok) {
      loadRoster();
      return;
    }
    const code = res.data?.error?.code;
    if (res.status === 409 && code === "shift_not_ended") {
      setBanner("You can mark attendance once the shift has ended.");
    } else {
      setBanner(res.data?.error?.message ?? "Couldn't mark attendance. Try again.");
    }
  }

  function confirmNoShow() {
    const signupId = noShowSignupId;
    setNoShowSignupId(null);
    if (signupId) markAttendance(signupId, "no_show");
  }

  async function undo(signupId: string) {
    if (busySignupId) return;
    setBusySignupId(signupId);
    setBanner(null);
    const res = await api.post(`/shelter/signups/${signupId}/attendance/undo`);
    setBusySignupId(null);
    if (res.ok) {
      loadRoster();
    } else {
      setBanner(res.data?.error?.message ?? "Couldn't undo that. Try again.");
    }
  }

  const noShowRow = noShowSignupId ? roster.find((r) => r.signup_id === noShowSignupId) : undefined;
  const state = loadState(res);

  return (
    <View>
      {!!banner && (
        <View style={styles.bannerBox}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      )}

      {state.kind !== "ready" ? (
        <LoadStateView state={state} emptyTitle="No approved volunteers yet" onRetry={loadRoster} />
      ) : roster.length === 0 ? (
        <Text style={styles.empty}>No approved volunteers yet.</Text>
      ) : (
        roster.map((row) => {
          const busy = busySignupId === row.signup_id;
          const suggestion = attendanceSuggestion(row);
          return (
            <Card key={row.signup_id} style={styles.card}>
              <View style={styles.cardTop}>
                <Avatar initials={initials(row.volunteer.display_name)} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{row.volunteer.display_name}</Text>
                  {row.status === "approved" && <Text style={styles.times}>{checkTimes(row)}</Text>}
                </View>
                {row.status !== "approved" && (
                  <Chip label={OUTCOME_CHIP[row.status].label} tone={OUTCOME_CHIP[row.status].tone} />
                )}
              </View>

              {row.status === "approved" ? (
                <View style={styles.actionsRow}>
                  <Button
                    size="small"
                    variant={suggestion === "completed" ? "secondary" : "primary"}
                    label="No-show"
                    onPress={() => setNoShowSignupId(row.signup_id)}
                    loading={busy}
                    style={styles.half}
                  />
                  <Button
                    size="small"
                    variant={suggestion === "completed" ? "primary" : "secondary"}
                    label="Attended"
                    onPress={() => markAttendance(row.signup_id, "completed")}
                    loading={busy}
                    style={styles.half}
                  />
                </View>
              ) : row.can_undo ? (
                <TouchableOpacity style={styles.undoBtn} onPress={() => undo(row.signup_id)} disabled={busy}>
                  <Text style={styles.undoText}>{busy ? "Undoing…" : "Undo"}</Text>
                </TouchableOpacity>
              ) : null}
            </Card>
          );
        })
      )}

      <ConfirmModal
        visible={!!noShowSignupId}
        title={`Mark ${noShowRow?.volunteer.display_name ?? "this volunteer"} as a no-show?`}
        body="This counts toward the 3-in-a-row rule. You can undo it for 24 hours."
        confirmLabel="Mark no-show"
        tone="danger"
        onConfirm={confirmNoShow}
        onCancel={() => setNoShowSignupId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.muted, ...typography.body, textAlign: "center", marginTop: 8 },
  bannerBox: { marginBottom: 12, borderRadius: radii.notice, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.dangerBg },
  bannerText: { color: colors.danger, ...typography.meta, fontWeight: "700", textAlign: "center" },
  card: { padding: 16, marginBottom: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  times: { marginTop: 2, color: colors.muted, ...typography.meta },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  half: { flex: 1, alignSelf: "stretch" },
  undoBtn: { marginTop: 14, alignSelf: "flex-start", height: 44, justifyContent: "center" },
  undoText: { color: colors.teal, ...typography.meta, fontWeight: "800" }
});
