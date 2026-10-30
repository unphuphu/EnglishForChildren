const modules = import.meta.glob('./lessons/*.json', { eager: true, import: 'default' })

export default Object.values(modules).sort((a, b) => a.order - b.order)
