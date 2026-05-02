# User Rule Reference

These rules define how the assistant should interpret user instructions in this workspace.

1. If a sentence ends with `?`, treat it as a question request.
- Do not perform file edits or task execution.
- Reply with a short answer only.

2. The word `deploy` means `commit + push`.

3. If the user says `simple explanation`, respond in this format:
- No technical terms.
- Web user point of view.
- Exactly 3 short lines.

4. If the user says `explain again`, respond in this format:
- No technical terms.
- Web user point of view.
- Exactly 3 short lines.

5. If the user says `easy` or `again`, respond in this format:
- No technical terms.
- Web user point of view.
- Exactly 3 short lines.

6. If the user says `explain with logic`, respond in this format:
- Show actual file name(s).
- Explain the logic so it is easy to follow.
- Keep it within 3 lines.
