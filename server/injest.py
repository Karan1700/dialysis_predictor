from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

def ingest_pdf(pdf_path, index_path="faiss_index"):
    # Load PDF
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()

    # Split text
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    docs = text_splitter.split_documents(documents)

    # Local embedding model (FREE)
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    # Store in FAISS
    vectorstore = FAISS.from_documents(docs, embeddings)

    # Save index
    vectorstore.save_local(index_path)

    print("✅ PDF stored in FAISS (free embeddings)!")

if __name__ == "__main__":
    ingest_pdf("dialysis-treatment-a-comprehensive-description.pdf")
