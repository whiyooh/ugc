import type { AppData } from "../types/domain"

export const previewWorkspace: AppData = {
  products: [
    {
      id: "preview-product-1",
      name: "Bolsa Aurora",
      category: "Acessórios",
      price: "129.90",
      platform: "Shopee",
      benefits:
        "Design versátil, material leve e espaço para os itens do dia a dia.",
      audience: "Pessoas que buscam praticidade e estilo para a rotina.",
      link: "https://example.com/bolsa-aurora",
      image: "/images/bag.jpg",
      status: "Produção",
    },
    {
      id: "preview-product-2",
      name: "Organizador Casa Clara",
      category: "Casa",
      price: "59.90",
      platform: "TikTok Shop",
      benefits:
        "Ajuda a organizar pequenos espaços e facilita o acesso aos objetos.",
      audience: "Pessoas que querem manter a casa mais funcional.",
      link: "https://example.com/organizador",
      image: "/images/organizer.jpg",
      status: "Publicado",
    },
    {
      id: "preview-product-3",
      name: "Camiseta Essencial",
      category: "Moda",
      price: "79.90",
      platform: "SHEIN",
      benefits:
        "Peça confortável, fácil de combinar e adequada para diferentes ocasiões.",
      audience: "Pessoas que procuram básicos versáteis para o guarda-roupa.",
      link: "https://example.com/camiseta",
      image: "/images/shirt.jpg",
      status: "Ideias",
    },
  ],
  creators: [
    {
      id: "preview-creator-1",
      name: "Lia Martins",
      age: "27",
      style: "Natural e acolhedor",
      description:
        "Criadora de lifestyle que apresenta produtos com leveza e foco na rotina real.",
      prompt:
        "Apresente o produto em primeira pessoa, com tom próximo, natural e informativo.",
      image: "/images/creator-1.jpg",
    },
    {
      id: "preview-creator-2",
      name: "Bia Costa",
      age: "31",
      style: "Prático e bem-humorado",
      description:
        "Demonstra soluções para casa com dicas diretas e linguagem acessível.",
      prompt:
        "Mostre uma situação cotidiana, demonstre o produto e finalize com uma dica prática.",
      image: "/images/creator-2.jpg",
    },
  ],
  copies: [
    {
      id: "preview-copy-1",
      title: "Um detalhe que muda a rotina",
      type: "Hook",
      product: "Bolsa Aurora",
      content:
        "Eu queria uma bolsa bonita que também acompanhasse meu dia inteiro. Olha o espaço dessa aqui.",
      platform: "TikTok",
    },
    {
      id: "preview-copy-2",
      title: "Tudo no lugar, sem complicação",
      type: "Legenda",
      product: "Organizador Casa Clara",
      content:
        "Uma solução simples para deixar os itens do dia a dia sempre à mão.",
      platform: "Instagram",
    },
  ],
  videos: [
    {
      id: "preview-video-1",
      title: "Rotina leve com a Bolsa Aurora",
      product: "Bolsa Aurora",
      creator: "Lia Martins",
      status: "Produção",
      note: "Gravar cenas de uso no cotidiano.",
      image: "/images/bag.jpg",
    },
    {
      id: "preview-video-2",
      title: "Organização em poucos minutos",
      product: "Organizador Casa Clara",
      creator: "Bia Costa",
      status: "Publicado",
      note: "Revisar os resultados após a publicação.",
      image: "/images/organizer.jpg",
    },
    {
      id: "preview-video-3",
      title: "Três looks com uma peça",
      product: "Camiseta Essencial",
      creator: "Lia Martins",
      status: "Ideias",
      note: "Preparar referências e escolher os looks.",
      image: "/images/shirt.jpg",
    },
  ],
  references: [
    {
      id: "preview-reference-1",
      title: "Demonstração de produto no dia a dia",
      link: "https://example.com/referencia-ugc",
      note: "Abrir com uma situação cotidiana e mostrar o benefício em uso.",
      image: "/images/home.jpg",
    },
  ],
  feedbacks: [
    {
      id: "preview-feedback-1",
      campaign: "Rotina leve com a Bolsa Aurora",
      comment: "A ideia está clara e o produto aparece bem nas cenas.",
      adjustment: "Incluir um close do espaço interno antes da chamada final.",
      status: "Pendente",
    },
  ],
  drafts: [
    {
      id: "preview-draft-1",
      title: "Ideia para o próximo vídeo",
      content:
        "Começar mostrando a correria da manhã e apresentar uma solução simples para organizar a bolsa.",
      updatedAt: "2026-10-11T12:00:00.000Z",
    },
  ],
  completedSteps: ["preview-video-2"],
}
