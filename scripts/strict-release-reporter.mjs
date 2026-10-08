export default class StrictReleaseReporter {
  skipped = [];

  onTestEnd(test, result) {
    if (result.status === 'skipped') {
      this.skipped.push(`${test.location.file}:${test.location.line} ${test.titlePath().join(' > ')}`);
    }
  }

  onEnd(result) {
    if (this.skipped.length === 0) return;
    process.stderr.write(`\nRelease browser gate rejected ${this.skipped.length} skipped test(s):\n`);
    for (const item of this.skipped) process.stderr.write(`- ${item}\n`);
    return { status: 'failed' };
  }
}
