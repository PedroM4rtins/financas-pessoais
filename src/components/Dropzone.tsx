import { FileUp } from 'lucide-react';
import { useRef, useState } from 'react';

type Props = { onFiles: (files: File[]) => void };

export function Dropzone({ onFiles }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(event) => {
        event.preventDefault();
        setHover(false);
        onFiles([...event.dataTransfer.files]);
      }}
      className={`block w-full cursor-pointer rounded-card border-2 border-dashed p-11 text-center transition ${
        hover ? 'border-accent' : ''
      } bg-accent-soft hover:border-accent`}
      style={hover ? undefined : { borderColor: 'rgb(var(--c-drop-line))' }}
    >
      <FileUp size={34} strokeWidth={1.5} aria-hidden="true" className="mx-auto text-accent" />
      <b className="mb-1 mt-3 block font-display text-[17px] tracking-[-0.01em]">
        Solte seus arquivos aqui ou clique para escolher
      </b>
      <span className="text-muted">
        PDF ou CSV · Inter, Nubank e Itaú · outros bancos pelo leitor genérico
      </span>
      <input
        ref={input}
        type="file"
        accept=".pdf,.csv"
        multiple
        hidden
        aria-label="Escolher arquivos"
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
    </button>
  );
}
