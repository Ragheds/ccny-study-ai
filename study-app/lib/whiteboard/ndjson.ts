// Streaming line decoder shared by server and client. No parsing of an incomplete line.
export class LineDecoder {
  private buffer = "";
  push(text: string, finish = false) {
    this.buffer += text;
    if (this.buffer.length > 60000) throw Error("Lesson line too large.");
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? "";
    if (finish && this.buffer.trim()) {
      lines.push(this.buffer);
      this.buffer = "";
    }
    return lines.filter((line) => line.trim());
  }
}
