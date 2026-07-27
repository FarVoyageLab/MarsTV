# MarsTV 1.0 release gate

No package may be labeled 1.0 production until every blocking item is recorded
as passed with an artifact or report link.

## Automated

- [ ] All TypeScript and Rust checks pass from a clean checkout.
- [ ] Unit, fuzz/property, Worker integration, Web Playwright, Tauri WebDriver,
      Maestro, native, and TV remote-path suites pass.
- [ ] Web/Worker, universal macOS, Windows MSIX/installer, Linux
      AppImage/DEB/RPM/Flatpak, iOS/iPadOS/tvOS, AAB, and sideload APK install.
- [ ] SBOM and third-party notices match each binary.
- [ ] No Critical or High security finding remains open.
- [ ] Cached API p95 < 300 ms, aggregate first results < 1.5 s, aggregate
      deadline <= 4 s, playback startup p95 < 3 s, TV focus < 100 ms at 60 fps.

## Operational

- [ ] Forward migration, rollback, encrypted backup restore, and disaster
      recovery have current evidence.
- [ ] Queue duplicate delivery and DLQ replay are harmless and audited.
- [ ] Privacy export and deletion are verified end to end.
- [ ] Logs and diagnostic bundles contain no protected fields.
- [ ] Release candidate has at least 14 days of evidence and >= 99.5% crash-free
      sessions on every shipped client family.

## Legal and store

- [ ] Every configured production source and reviewer source has authorization.
- [ ] Douban written permission/legal review is attached, or the provider flag
      remains off in every production environment.
- [ ] CLA, AGPL source offer, App Store Exception grant, asset license, privacy
      forms, screenshots, and reviewer notes are current.
- [ ] Apple/Google/Microsoft/Linux packages are signed and notarized where
      required, and can be installed on clean physical devices.

The repository delivers the implementation and automation for these checks.
Credentials, store approvals, content authorization, physical-device evidence,
and the 14-day reliability window are external evidence and cannot be
self-certified by source code.
