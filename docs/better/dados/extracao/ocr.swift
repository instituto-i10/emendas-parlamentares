import Foundation
import Vision
import AppKit

// OCR de imagens via Vision (macOS). Uso: ocr <modo> <arquivo.png> ...
// modo = "texto"  -> linhas de texto na ordem de leitura
// modo = "caixas" -> TSV: x y w h texto  (coordenadas normalizadas, origem canto inf. esq.)

let args = CommandLine.arguments
guard args.count >= 3 else {
  FileHandle.standardError.write("uso: ocr <texto|caixas> <img>...\n".data(using: .utf8)!)
  exit(2)
}
let modo = args[1]

for caminho in args.dropFirst(2) {
  guard let img = NSImage(contentsOfFile: caminho),
        let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("falhou ao abrir: \(caminho)\n".data(using: .utf8)!)
    continue
  }
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  req.recognitionLanguages = ["pt-BR", "en-US"]
  req.usesLanguageCorrection = false          // códigos e valores: correção atrapalha
  req.revision = VNRecognizeTextRequestRevision3

  let handler = VNImageRequestHandler(cgImage: cg, options: [:])
  do { try handler.perform([req]) } catch {
    FileHandle.standardError.write("erro OCR \(caminho): \(error)\n".data(using: .utf8)!)
    continue
  }
  let obs = req.results ?? []
  print("### \(URL(fileURLWithPath: caminho).lastPathComponent)")
  if modo == "caixas" {
    for o in obs {
      guard let t = o.topCandidates(1).first else { continue }
      let b = o.boundingBox
      print(String(format: "%.4f\t%.4f\t%.4f\t%.4f\t%@", b.minX, b.minY, b.width, b.height, t.string))
    }
  } else {
    // ordem de leitura: topo->base, esq->dir, agrupando por faixa horizontal
    let linhas = obs.compactMap { o -> (CGFloat, CGFloat, String)? in
      guard let t = o.topCandidates(1).first else { return nil }
      return (o.boundingBox.midY, o.boundingBox.minX, t.string)
    }.sorted { a, b in
      if abs(a.0 - b.0) > 0.006 { return a.0 > b.0 }
      return a.1 < b.1
    }
    var yAnterior: CGFloat = -1
    var buffer: [String] = []
    for (y, _, s) in linhas {
      if yAnterior >= 0 && abs(y - yAnterior) > 0.006 {
        print(buffer.joined(separator: "  |  ")); buffer = []
      }
      buffer.append(s); yAnterior = y
    }
    if !buffer.isEmpty { print(buffer.joined(separator: "  |  ")) }
  }
}
