import home from './javascripts/home'
import sections from './javascripts/sections'
import skills from './javascripts/skills'

import intersect from '@alpinejs/intersect'

import type { Alpine } from 'alpinejs'
export default (Alpine: Alpine) => {
  Alpine.plugin(intersect)
  
  Alpine.data('sections', sections)
  Alpine.data('home', home)
  Alpine.data('skills', skills)
}
 