const modules = import.meta.glob('./*.json', { eager: true, import: 'default' })

export default Object.keys(modules)
  .sort()
  .flatMap((path) => modules[path])
